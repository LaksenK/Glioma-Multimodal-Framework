'use client'
import { useState } from 'react'
import { Explanation, PredictionResult } from '@/lib/types'

interface Props {
  explanations: Explanation[]
  onResult: (result: PredictionResult) => void
}

type FileKey = 't1' | 't1ce' | 't2' | 'flair'

// BraTS filenames look like "BraTS2021_00106_flair.nii" — pull the 5-digit ID out.
function extractId(filename: string): string | null {
  const match = filename.match(/(\d{5})/)
  return match ? match[1] : null
}

export default function UploadForm({ explanations, onResult }: Props) {
  const [files, setFiles]     = useState<Record<FileKey, File | null>>({
    t1: null, t1ce: null, t2: null, flair: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const modalities: { key: FileKey; label: string }[] = [
    { key: 't1',    label: 'T1' },
    { key: 't1ce',  label: 'T1CE' },
    { key: 't2',    label: 'T2' },
    { key: 'flair', label: 'FLAIR' },
  ]

  const allFilesSelected = Object.values(files).every(Boolean)

  // Figure out which patient this is from the filenames the user picked
  const detectedIds = Object.values(files)
    .filter((f): f is File => !!f)
    .map(f => extractId(f.name))
  const uniqueIds    = Array.from(new Set(detectedIds.filter(Boolean)))
  const idsAgree     = allFilesSelected && uniqueIds.length === 1
  const detectedId   = idsAgree ? uniqueIds[0] : null
  const fullPatientId = detectedId ? `BraTS2021_${detectedId}` : null

  const matchedExplanation = fullPatientId
    ? explanations.find(e => e.patient_id === fullPatientId) ?? null
    : null

  const handleSubmit = async () => {
    if (!allFilesSelected) return
    setError(null)
    setSuccess(false)

    if (!idsAgree) {
      setError("The 4 files don't share the same patient ID — check the filenames.")
      return
    }
    if (!matchedExplanation) {
      setError(
        `Patient ${detectedId} isn't part of the 21-patient test set. ` +
        `General inference on new patients is planned for the next phase.`
      )
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/sample_reports/${matchedExplanation.patient_id}_report.txt`)
      const reportText = res.ok ? await res.text() : 'Report not found for this patient.'
      onResult({ explanation: matchedExplanation, report_text: reportText })
      setSuccess(true)
    } catch {
      setError('Could not load the report for this patient.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFiles({ t1: null, t1ce: null, t2: null, flair: null })
    setSuccess(false)
    setError(null)
  }

  return (
    <div className="bg-gray-900 border border-gray-800
                    rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-400
                       uppercase tracking-wider">
          Upload MRI Files
        </h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Upload the 4 sequences for one of the 21 test patients
          (e.g. BraTS2021_00106_*.nii) to view its prediction.
        </p>
      </div>

      {/* File uploads */}
      <div className="grid grid-cols-2 gap-3">
        {modalities.map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-gray-400 mb-1 block">
              {label}
            </label>
            <input
              type="file"
              accept=".gz,.nii"
              onChange={e => setFiles(prev => ({
                ...prev,
                [key]: e.target.files?.[0] || null
              }))}
              className="w-full text-xs text-gray-400
                         file:mr-2 file:py-1.5 file:px-3
                         file:rounded-lg file:border-0
                         file:bg-gray-800 file:text-gray-300
                         file:text-xs hover:file:bg-gray-700
                         file:transition-colors cursor-pointer"
            />
            {files[key] && (
              <p className="text-[11px] text-green-400 mt-1 truncate">
                ✓ {files[key]!.name}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Detected patient ID */}
      {allFilesSelected && (
        <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-xs animate-fade-in">
          {idsAgree ? (
            <p className="text-gray-300">
              Detected patient:{' '}
              <span className="font-mono text-white">{fullPatientId}</span>
              {matchedExplanation ? (
                <span className="text-green-400 ml-1">— found in test set ✓</span>
              ) : (
                <span className="text-yellow-400 ml-1">— not in the 21-patient test set</span>
              )}
            </p>
          ) : (
            <p className="text-red-400">
              Filenames don't agree on a patient ID — check your files.
            </p>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!allFilesSelected || loading}
        className={`w-full py-3 rounded-lg font-semibold
                    text-sm transition-colors
                    ${allFilesSelected && !loading
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    }`}
      >
        {loading ? '🔄 Loading prediction…' : '🧠 Predict Subtype'}
      </button>

      {error && (
        <p className="text-red-400 text-xs bg-red-900/30
                      border border-red-800 rounded-lg p-2 animate-fade-in">
          ❌ {error}
        </p>
      )}

      {success && !error && (
        <div className="flex items-center justify-between gap-2 animate-fade-in">
          <p className="text-green-400 text-xs">
            ✓ Match found — see result panel.
          </p>
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-gray-200
                       underline underline-offset-2 flex-shrink-0"
          >
            Upload another
          </button>
        </div>
      )}

      {!allFilesSelected && (
        <p className="text-gray-500 text-xs text-center">
          Upload all 4 NIfTI files to check this patient's prediction
        </p>
      )}
    </div>
  )
}
