import { Explanation, CLASS_COLORS } from '@/lib/types'

interface Props {
  explanation: Explanation
}

export default function PrototypePanel({ explanation }: Props) {
  const color = CLASS_COLORS[explanation.nearest_class] || '#888'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase
                     tracking-wider mb-4">
        Ante-Hoc Prototype Explanation
      </h3>

      {/* Prototype badge */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center
                     justify-center text-white font-bold text-xl
                     border-2 border-opacity-60 flex-shrink-0"
          style={{ backgroundColor: color + '33', borderColor: color }}
        >
          P{explanation.nearest_proto}
        </div>
        <div>
          <p className="text-white font-semibold">
            Prototype {explanation.nearest_proto}
          </p>
          <p className="text-sm" style={{ color }}>
            {explanation.nearest_class.charAt(0).toUpperCase() +
             explanation.nearest_class.slice(1)} class
          </p>
          <p className="text-xs text-gray-400 tabular-nums">
            Similarity: {(explanation.similarity_score * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Similarity bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Prototype similarity</span>
          <span className="tabular-nums">{(explanation.similarity_score * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(0, explanation.similarity_score * 100)}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>

      {/* Explanation text */}
      <div className="bg-gray-800/60 rounded-lg p-3 text-xs text-gray-300
                      leading-relaxed">
        <p className="font-semibold text-white mb-1">
          Why this prediction?
        </p>
        <p>
          This patient's MRI texture pattern most closely matches{' '}
          <span className="font-semibold" style={{ color }}>
            Prototype {explanation.nearest_proto}
          </span>{' '}
          of the {explanation.nearest_class} class
          (similarity: {(explanation.similarity_score * 100).toFixed(1)}%).
        </p>
        <p className="mt-2">
          Unlike Grad-CAM heatmaps, this explanation is
          <span className="text-blue-300 font-semibold"> built into
          the model architecture </span>
          — not generated after the fact.
        </p>
      </div>

      {/* Molecular context */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'IDH',    value: explanation.idh_status },
          { label: '1p/19q', value: explanation.codel_status },
          { label: 'MGMT',   value: explanation.mgmt_status },
        ].map(({ label, value }) => (
          <div key={label}
               className="bg-gray-800/60 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-xs text-white font-medium mt-0.5
                          leading-tight">
              {value.replace('IDH-', '').replace(' codeleted', ' codel.')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
