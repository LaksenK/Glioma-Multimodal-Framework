'use client'
import { useState } from 'react'
import { Explanation, PredictionResult } from '@/lib/types'
import ReportPanel from './ReportPanel'
import UploadForm from './UploadForm'
import ResultCard from './ResultCard'

interface Props {
  explanations: Explanation[]
}

type Tab = 'test' | 'upload'

export default function DashboardTabs({ explanations }: Props) {
  const [tab, setTab]       = useState<Tab>('test')
  const [result, setResult] = useState<PredictionResult | null>(null)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'test',   label: 'Test Patients (21)' },
    { key: 'upload', label: 'Upload & Verify' },
  ]

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 border-b border-gray-800">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors
                       border-b-2 -mb-px
                       ${tab === key
                         ? 'text-white border-blue-500'
                         : 'text-gray-500 border-transparent hover:text-gray-300'
                       }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'test' && <ReportPanel explanations={explanations} />}

      {tab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <UploadForm explanations={explanations} onResult={setResult} />
          </div>
          <div className="lg:col-span-2">
            {result ? (
              <div key={result.explanation.patient_id} className="animate-fade-slide-in">
                <ResultCard
                  explanation={result.explanation}
                  reportText={result.report_text}
                />
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl
                              p-10 text-center text-gray-500 text-sm h-full
                              flex items-center justify-center min-h-[300px]">
                Upload all 4 MRI sequences for a test patient to see its prediction here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
