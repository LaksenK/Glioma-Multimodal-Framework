import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'XAI Glioma Stratification System',
  description: 'Interpretable-by-design multimodal AI for glioma molecular subtyping',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-gray-800
                           bg-gray-950/90 backdrop-blur px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                🧠 XAI Glioma Stratification
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                CG-MAF + Prototype Learning — FYP Research Prototype
              </p>
            </div>
            <span className="text-xs bg-yellow-900/60 text-yellow-300
                             px-3 py-1 rounded-full border border-yellow-700
                             whitespace-nowrap">
              ⚠️ Research Only — Not for Clinical Use
            </span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-800 mt-16 py-6 text-center
                           text-xs text-gray-500">
          University of Staffordshire FYP · CB011675 ·
          Supervised by Ms. M.F.F. Nuha
        </footer>
      </body>
    </html>
  );

}
