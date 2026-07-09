import { useState, type FormEvent } from 'react'

interface Props {
  title: string
  onConfirm: (token: string) => Promise<void>
  onClose: () => void
}

export default function TokenModal({ title, onConfirm, onClose }: Props) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      await onConfirm(token.trim())
      setToken('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
      // Clear token from memory
      setToken('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-700">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 text-xs text-yellow-300">
          <p className="font-medium mb-1">🔒 Sécurité du token</p>
          <p>Ce token n'est <strong>jamais sauvegardé</strong> par l'application. Il est utilisé uniquement pour cette action puis effacé de la mémoire.</p>
          <p className="mt-1">Recommandation : utilisez un <strong>fine-grained PAT</strong> limité à ce repo avec uniquement la permission Contents (read/write), dans un repo privé.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="label">GitHub Personal Access Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            className="input-field mb-4"
            placeholder="ghp_..."
            autoFocus
          />
          
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded p-2 mb-3 text-sm text-red-300">
              {error}
            </div>
          )}
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || !token.trim()}>
              {loading ? '...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
