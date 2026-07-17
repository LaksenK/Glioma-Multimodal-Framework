'use client'
import { useMemo, useState } from 'react'
import { Explanation, CLASS_COLORS } from '@/lib/types'
import ResultCard from './ResultCard'

interface Props {
  explanations: Explanation[]
}

type StatusFilter = 'all' | 'correct' | 'incorrect'
type ClassFilter = 'all' | 'glioblastoma' | 'astrocytoma' | 'oligodendroglioma'

const CLASS_FILTERS: { key: ClassFilter; label: string }[] = [
  { key: 'all', label: 'All classes' },
  { key: 'glioblastoma', label: 'GBM' },
  { key: 'astrocytoma', label: 'Astro' },
  { key: 'oligodendroglioma', label: 'Oligo' },
]

export default function ReportPanel({ explanations }: Props) {
  const [selectedId, setSelectedId] = useState<string>(explanations[0].patient_id)
  const [reportText, setReportText] = useState<string>('')
  const [reportLoading, setReportLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [classFilter, setClassFilter] = useState<ClassFilter>('all')

  const exp = explanations.find(e => e.patient_id === selectedId) ?? explanations[0]

  const loadReport = async (patientId: string) => {
    setReportLoading(true)
    try {
      const res  = await fetch(`/sample_reports/${patientId}_report.txt`)
      const text = await res.text()
      setReportText(text)
    } catch {
      setReportText('Report file not found for this patient.')
    } finally {
      setReportLoading(false)
    }
  }

  const handleSelect = (patientId: string) => {
    if (patientId === selectedId) return
    setSelectedId(patientId)
    loadReport(patientId)
  }

  // Load first report on mount
  useState(() => { loadReport(exp.patient_id) })

  const filtered = useMemo(() => {
    return explanations.filter(e => {
      const isCorrect = e.predicted_class === e.true_label
      if (statusFilter === 'correct' && !isCorrect) return false
      if (statusFilter === 'incorrect' && isCorrect) return false
      if (classFilter !== 'all' && e.true_label !== classFilter) return false
      if (query && !e.patient_id.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [explanations, query, statusFilter, classFilter])

  const correctCount = explanations.filter(e => e.predicted_class === e.true_label).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Patient selector */}
      <div className="lg:col-span-1">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Test Patients
          </h3>
          <span className="text-xs text-gray-500 tabular-nums">
            {correctCount}/{explanations.length} correct
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search patient ID…"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg
                       pl-8 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-600
                       focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(['all', 'correct', 'incorrect'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors
                         ${statusFilter === f
                           ? 'bg-blue-900/60 border-blue-700 text-blue-200'
                           : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                         }`}
            >
              {f === 'all' ? 'All' : f === 'correct' ? '✅ Correct' : '❌ Incorrect'}
            </button>
          ))}
        </div>

        {/* Class filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CLASS_FILTERS.map(({ key, label }) => {
            const active = classFilter === key
            const dotColor = CLASS_COLORS[key] ?? '#6b7280'
            return (
              <button
                key={key}
                onClick={() => setClassFilter(key)}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors
                           ${active
                             ? 'text-white'
                             : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                           }`}
                style={active
                  ? { backgroundColor: dotColor + '33', borderColor: dotColor }
                  : undefined}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* List */}
        <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-8">
              No patients match this filter.
            </p>
          )}
          {filtered.map((e) => {
            const isCorrect  = e.predicted_class === e.true_label
            const isSelected = e.patient_id === selectedId
            const dotColor   = CLASS_COLORS[e.true_label] || '#888'
            return (
              <button
                key={e.patient_id}
                onClick={() => handleSelect(e.patient_id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg
                           border transition-all duration-150 text-xs
                           ${isSelected
                             ? 'bg-blue-950/60 border-blue-700'
                             : 'bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80'
                           }`}
              >
                <div className="flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-1.5 text-gray-300 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }} />
                    {e.patient_id.replace('BraTS2021_', '')}
                  </span>
                  <span>{isCorrect ? '✅' : '❌'}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-500">
                    {e.true_label.substring(0, 10)}
                  </span>
                  <span className="text-gray-400 tabular-nums">
                    {(e.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Result display */}
      <div className="lg:col-span-2">
        <div key={exp.patient_id} className="animate-fade-slide-in">
          <ResultCard
            explanation={exp}
            reportText={reportText}
            reportLoading={reportLoading}
          />
        </div>
      </div>
    </div>
  )
}
