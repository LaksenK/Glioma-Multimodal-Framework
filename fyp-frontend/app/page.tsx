import { Explanation, PrototypeBank } from '@/lib/types'
import DashboardTabs from '@/components/DashboardTabs'
import fs from 'fs'
import path from 'path'

async function getExplanations(): Promise<Explanation[]> {
  const filePath = path.join(process.cwd(), 'public', 'test_explanations.json')
  const raw      = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

async function getPrototypeBank(): Promise<PrototypeBank> {
  const filePath = path.join(process.cwd(), 'public', 'prototype_bank.json')
  const raw      = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

export default async function HomePage() {
  const explanations  = await getExplanations()
  const prototypeBank = await getPrototypeBank()

  const gbmCount   = explanations.filter(e => e.true_label === 'glioblastoma').length
  const astroCount = explanations.filter(e => e.true_label === 'astrocytoma').length
  const oligoCount = explanations.filter(e => e.true_label === 'oligodendroglioma').length
  const correct    = explanations.filter(e => e.predicted_class === e.true_label).length

  return (
    <div className="space-y-10">

      {/* Hero */}
      <div className="text-center py-6">
        <h2 className="text-3xl font-bold text-white mb-3">
          Causal-XAI Framework for Glioblastoma
          <br />
          <span className="text-blue-400">Molecular Stratification</span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
          An interpretable-by-design multimodal system integrating MRI and genomic data.
          Uses Cross-Gated Multi-Path Attention Fusion (CG-MAF) and ante-hoc
          prototype learning to classify gliomas according to WHO 2021 criteria.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Test Patients',      value: explanations.length, color: 'text-white' },
          { label: 'Correct Predictions',value: `${correct}/21`,     color: 'text-green-400' },
          { label: 'Learned Prototypes', value: '15',                color: 'text-blue-400' },
          { label: 'Model Architecture', value: 'CG-MAF + Proto',    color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label}
               className="bg-gray-900 border border-gray-800 hover:border-gray-700
                          rounded-2xl p-4 text-center transition-colors duration-200">
            <p className={`text-2xl font-bold ${color} tabular-nums`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Class distribution */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'Glioblastoma',      count: gbmCount,   color: '#E74C3C' },
          { name: 'Astrocytoma',       count: astroCount, color: '#2ECC71' },
          { name: 'Oligodendroglioma', count: oligoCount, color: '#3498DB' },
        ].map(({ name, count, color }) => (
          <div key={name}
               className="bg-gray-900 border border-gray-800 hover:border-gray-700
                          rounded-2xl p-4 text-center transition-colors duration-200">
            <div className="w-3 h-3 rounded-full mx-auto mb-2"
                 style={{ backgroundColor: color }} />
            <p className="text-lg font-bold text-white tabular-nums">{count}</p>
            <p className="text-xs text-gray-400">{name}</p>
          </div>
        ))}
      </div>

      {/* Main results section */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Test Set Results — Prototype Explanations
        </h2>
        <DashboardTabs explanations={explanations} />
      </div>

    </div>
  )
}
