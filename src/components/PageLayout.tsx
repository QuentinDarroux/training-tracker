import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

export default function PageLayout({ title, children }: Props) {
  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-700 z-40 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-100">{title}</h1>
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
