'use client'
import { Explanation, CLASS_COLORS, CLASS_LABELS } from '@/lib/types'
import UncertaintyBadge from './UncertaintyBadge'
import PrototypePanel from './PrototypePanel'
import MRIGallery from './MRIGallery'

interface Props {
  explanation: Explanation
  reportText?: string
  reportLoading?: boolean
}

export default function ResultCard({ explanation, reportText, reportLoading }: Props) {
  const color      = CLASS_COLORS[explanation.predicted_class] || '#888'
  const classLabel = CLASS_LABELS[explanation.predicted_class] || explanation.predicted_class
  const classNames = ['Glioblastoma', 'Astrocytoma', 'Oligodendroglioma']

  const handleDownload = () => {
    if (!reportText) return
    const blob = new Blob([reportText], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${explanation.patient_id}_report.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">

      {/* Main prediction */}
      <div className="bg-gray-900 border rounded-2xl p-5 transition-colors duration-300"
           style={{ borderColor: color + '66' }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Predicted WHO 2021 Subtype
            </p>
            <h2 className="text-2xl font-bold" style={{ color }}>
              {classLabel}
            </h2>
            <p className="text-sm text-gray-500 mt-1 font-mono">
              {explanation.patient_id}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white tabular-nums">
              {(explanation.confidence * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400">confidence</p>
          </div>
        </div>

        {/* Probability bars */}
        <div className="mt-4 space-y-2.5">
          {explanation.mean_probs.map((prob, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{classNames[i]}</span>
                <span className="text-gray-300 tabular-nums">
                  {(prob * 100).toFixed(1)}%
                  <span className="text-gray-500 ml-1">
                    ±{(explanation.std_probs[i] * 100).toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${prob * 100}%`,
                    backgroundColor: Object.values(CLASS_COLORS)[i]
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MRI visualization */}
      <MRIGallery patientId={explanation.patient_id} />

      {/* Uncertainty badge */}
      <UncertaintyBadge
        level={explanation.confidence_level}
        uncertainty={explanation.uncertainty}
        uncertain_flag={explanation.uncertain_flag}
      />

      {/* Prototype explanation */}
      <PrototypePanel explanation={explanation} />

      {/* Report */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase
                       tracking-wider mb-3">
          Clinical Report
        </h3>

        {reportLoading ? (
          <div className="space-y-2 bg-gray-800/60 rounded-lg p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}
                   className="h-3 rounded bg-gray-700/60 animate-pulse"
                   style={{ width: `${85 - i * 10}%` }} />
            ))}
          </div>
        ) : (
          <pre className="text-xs text-gray-300 whitespace-pre-wrap
                          font-mono leading-relaxed bg-gray-800/60
                          rounded-lg p-4 overflow-auto max-h-80
                          animate-fade-in">
            {reportText}
          </pre>
        )}

        <button
          onClick={handleDownload}
          disabled={reportLoading || !reportText}
          className="mt-3 text-xs bg-blue-800 hover:bg-blue-700
                     disabled:bg-gray-800 disabled:text-gray-600
                     disabled:cursor-not-allowed
                     text-blue-200 px-3 py-1.5 rounded-lg
                     transition-colors"
        >
          ⬇ Download Report
        </button>
      </div>
    </div>
  )
}
