interface Props {
  level: 'HIGH' | 'MODERATE' | 'LOW'
  uncertainty: number
  uncertain_flag: boolean
}

export default function UncertaintyBadge({
  level, uncertainty, uncertain_flag
}: Props) {
  const config = {
    HIGH:     { bg: 'bg-green-900/40',  border: 'border-green-700',
                text: 'text-green-300',  label: '✅ High Confidence' },
    MODERATE: { bg: 'bg-yellow-900/40', border: 'border-yellow-700',
                text: 'text-yellow-300', label: '⚡ Moderate Confidence' },
    LOW:      { bg: 'bg-red-900/40',    border: 'border-red-700',
                text: 'text-red-300',    label: '⚠️ Low Confidence' },
  }

  const c = config[level]

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-3.5 transition-colors duration-300`}>
      <div className="flex items-center justify-between">
        <span className={`${c.text} font-semibold text-sm`}>
          {c.label}
        </span>
        <span className="text-gray-400 text-xs tabular-nums">
          σ = ±{uncertainty.toFixed(3)}
        </span>
      </div>
      {uncertain_flag && (
        <p className="text-red-300 text-xs mt-1.5">
          Near decision boundary — radiologist review recommended
        </p>
      )}
    </div>
  )
}
