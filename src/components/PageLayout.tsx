import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

export default function PageLayout({ title, children }: Props) {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="glass-topbar sticky top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <h1 className="text-lg font-bold text-gray-100">{title}</h1>
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
