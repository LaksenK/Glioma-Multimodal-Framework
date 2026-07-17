'use client'
import { useState } from 'react'

interface Props {
  patientId: string
}

type PanelKey = 'flair' | 'segmentation' | 'attention'

const PANELS: { key: PanelKey; label: string }[] = [
  { key: 'flair',        label: 'Input Sequence (FLAIR)' },
  { key: 'segmentation', label: 'Expert Segmentation Mask' },
  { key: 'attention',    label: 'CG-MAF Attention Map' },
]

export default function MRIGallery({ patientId }: Props) {
  const [failed, setFailed] = useState<Partial<Record<PanelKey, boolean>>>({})

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase
                     tracking-wider mb-4">
        MRI Visualization
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PANELS.map(({ key, label }) => {
          const src = `/mri_gallery/${patientId}/${key}.png`
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-xs text-gray-400 text-center">{label}</p>
              <div className="aspect-square bg-black rounded-lg overflow-hidden
                              border border-gray-800 flex items-center
                              justify-center">
                {failed[key] ? (
                  <p className="text-[11px] text-gray-600 text-center px-3">
                    Image not available
                  </p>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={label}
                    className="w-full h-full object-contain"
                    onError={() => setFailed(prev => ({ ...prev, [key]: true }))}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
