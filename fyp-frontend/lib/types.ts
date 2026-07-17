export interface Explanation {
  patient_id: string
  true_label: string
  predicted_class: string
  confidence: number
  uncertainty: number
  uncertain_flag: boolean
  confidence_level: 'HIGH' | 'MODERATE' | 'LOW'
  nearest_proto: number
  nearest_class: string
  similarity_score: number
  mean_probs: number[]
  std_probs: number[]
  idh_status: string
  codel_status: string
  mgmt_status: string
}

export interface Prototype {
  proto_id: number
  nearest_patient: {
    patient_id: string
    label: number
    class_name: string
    similarity: number
  }
}

export interface PrototypeBank {
  glioblastoma: Prototype[]
  astrocytoma: Prototype[]
  oligodendroglioma: Prototype[]
}

// ---- Shape the UI components actually consume (ResultCard, PrototypePanel) ----
export interface PredictionResult {
  explanation: Explanation
  report_text: string
}

// ---- Raw shape actually returned by FastAPI POST /api/predict ----
// { status, patient_id, prediction: {...}, report: "..." }
// Note: `prediction` does NOT include patient_id/idh_status/codel_status/
// mgmt_status — those have to be attached client-side from what was
// submitted, since the backend only uses them to build the text report
// and doesn't echo them back structurally.
export interface RawPrediction {
  predicted_class: string
  confidence: number
  uncertainty: number
  uncertain_flag: boolean
  confidence_level: 'HIGH' | 'MODERATE' | 'LOW'
  nearest_proto: number
  nearest_class: string
  similarity_score: number
  mean_probs: number[]
  std_probs: number[]
  clinical_note: string
}

export interface PredictApiResponse {
  status: string
  patient_id: string
  prediction: RawPrediction
  report: string
}

export const CLASS_COLORS: Record<string, string> = {
  glioblastoma:      '#E74C3C',
  astrocytoma:       '#2ECC71',
  oligodendroglioma: '#3498DB',
}

export const CLASS_LABELS: Record<string, string> = {
  glioblastoma:      'Glioblastoma (GBM)',
  astrocytoma:       'Astrocytoma',
  oligodendroglioma: 'Oligodendroglioma',
}
