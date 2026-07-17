import { Explanation, PredictionResult } from './types'

// Local fallback type for PredictApiResponse — the original types file
// doesn't export this name, so declare the shape we expect here.
type PredictApiResponse = {
  patient_id: string
  prediction: {
    predicted_class: string
    confidence: number
    uncertainty: number
    uncertain_flag: boolean
    confidence_level: string
    nearest_proto: any
    nearest_class: any
    similarity_score: number
    mean_probs: number[]
    std_probs: number[]
  }
  report: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchDemoExplanation(patientId: string) {
  const res = await fetch(`${API_BASE}/api/demo/${patientId}`)
  if (!res.ok) throw new Error('Failed to fetch explanation')
  return res.json()
}

export async function predictFromFiles(formData: FormData): Promise<PredictApiResponse> {
  const res = await fetch(`${API_BASE}/api/predict`, {
    method : 'POST',
    body   : formData,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Prediction failed')
  }
  return res.json()
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`)
  return res.json()
}

/**
 * The backend's `prediction` object doesn't include patient_id or the
 * molecular status labels (idh_status/codel_status/mgmt_status) — it only
 * uses those internally to build the text report. This mirrors the exact
 * same labeling logic from predict.py so the UI shows what was actually
 * submitted, and stitches everything into the Explanation shape ResultCard
 * expects.
 */
export function toPredictionResult(
  raw: PredictApiResponse,
  markers: { idh: number; codel: number; mgmt: number; mgmtAvail: number }
): PredictionResult {
  const idh_status = markers.idh === 1
    ? 'IDH-mutant'
    : 'IDH-wildtype'

  const codel_status = markers.codel === 1
    ? '1p/19q codeleted'
    : 'Non-codeleted'

  const mgmt_status = markers.mgmt === 1
    ? 'MGMT methylated'
    : markers.mgmtAvail === 1
      ? 'MGMT unmethylated'
      : 'MGMT status unknown'

  const explanation: Explanation = {
    patient_id       : raw.patient_id,
    true_label       : 'unknown', // no ground truth for a live upload
    predicted_class  : raw.prediction.predicted_class,
    confidence       : raw.prediction.confidence,
    uncertainty      : raw.prediction.uncertainty,
    uncertain_flag   : raw.prediction.uncertain_flag,
    // Ensure confidence_level matches the expected union type
    confidence_level : (['HIGH', 'MODERATE', 'LOW'] as const).includes(raw.prediction.confidence_level as any)
      ? (raw.prediction.confidence_level as 'HIGH' | 'MODERATE' | 'LOW')
      : 'LOW',
    nearest_proto    : raw.prediction.nearest_proto,
    nearest_class    : raw.prediction.nearest_class,
    similarity_score : raw.prediction.similarity_score,
    mean_probs       : raw.prediction.mean_probs,
    std_probs        : raw.prediction.std_probs,
    idh_status,
    codel_status,
    mgmt_status,
  }

  return { explanation, report_text: raw.report }
}
