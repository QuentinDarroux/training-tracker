import { useState, useRef } from 'react'
import PageLayout from '../components/PageLayout'
import TokenModal from '../components/TokenModal'
import type { UserSettings, GithubBackupConfig } from '../types'
import { exportData, downloadJson, validateImportData, importData } from '../services/backupService'
import { saveToGithub, restoreFromGithub, testConnection } from '../services/githubBackupService'
import { resetAllData, saveSettings } from '../services/storageService'

interface Props {
  settings: UserSettings | null
  onReload: () => Promise<void>
  onUpdateSettings: (s: UserSettings) => Promise<void>
}

type ModalAction = 'save' | 'restore' | 'test' | null

export default function SettingsPage({ settings, onReload, onUpdateSettings }: Props) {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [modalAction, setModalAction] = useState<ModalAction>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // GitHub config (non-token fields)
  const ghConfig = settings?.githubBackup
  const [ghOwner, setGhOwner] = useState(ghConfig?.owner ?? '')
  const [ghRepo, setGhRepo] = useState(ghConfig?.repo ?? '')
  const [ghBranch, setGhBranch] = useState(ghConfig?.branch ?? 'main')
  const [ghPath, setGhPath] = useState(ghConfig?.filePath ?? 'data/training-backup.json')
  const [showGhConfig, setShowGhConfig] = useState(false)

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleExport = async () => {
    try {
      const data = await exportData()
      downloadJson(data)
      // Update last backup timestamp
      if (settings) {
        const updated = { ...settings, lastLocalBackup: new Date().toISOString() }
        await onUpdateSettings(updated)
      }
      showMsg('Export réussi !')
    } catch {
      showMsg('Erreur lors de l\'export', 'error')
    }
  }

  const handleImport = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!validateImportData(data)) {
        showMsg('Fichier invalide ou non reconnu comme backup Training Tracker', 'error')
        return
      }
      if (!confirm(`Importer les données depuis ${file.name} ? Cela va fusionner avec les données existantes.`)) return
      await importData(data)
      await onReload()
      showMsg('Import réussi !')
    } catch {
      showMsg('Erreur lors de l\'import (fichier corrompu ?)', 'error')
    }
    e.target.value = ''
  }

  const handleReset = async () => {
    if (!confirm('Effacer TOUTES les données locales ? Cette action est irréversible.')) return
    if (!confirm('Confirmez-vous la suppression de toutes les séances et performances ?')) return
    await resetAllData()
    await onReload()
    showMsg('Données effacées')
  }

  const saveGhConfig = async () => {
    if (!settings) return
    const config: GithubBackupConfig = {
      owner: ghOwner,
      repo: ghRepo,
      branch: ghBranch,
      filePath: ghPath,
    }
    const updated: UserSettings = { ...settings, githubBackup: config }
    await saveSettings(updated)
    await onUpdateSettings(updated)
    showMsg('Configuration sauvegardée')
    setShowGhConfig(false)
  }

  const getGhConfig = (): GithubBackupConfig | null => {
    if (!ghOwner || !ghRepo) return null
    return { owner: ghOwner, repo: ghRepo, branch: ghBranch, filePath: ghPath }
  }

  const handleGhAction = async (token: string) => {
    const config = getGhConfig()
    if (!config) throw new Error('Configurez d\'abord owner/repo GitHub')

    try {
      if (modalAction === 'test') {
        const msg = await testConnection(config, token)
        showMsg(msg)
      } else if (modalAction === 'save') {
        const data = await exportData()
        await saveToGithub(config, token, data)
        if (settings) {
          await onUpdateSettings({ ...settings, lastLocalBackup: new Date().toISOString() })
        }
        showMsg('Sauvegarde GitHub réussie !')
      } else if (modalAction === 'restore') {
        const data = await restoreFromGithub(config, token)
        if (!confirm('Restaurer depuis GitHub ? Les données seront fusionnées.')) return
        await importData(data)
        await onReload()
        showMsg('Restauration GitHub réussie !')
      }
    } finally {
      // Token is used and cleared — it was only in function scope
      setModalAction(null)
    }
  }

  return (
    <PageLayout title="Réglages">
      <div className="space-y-4">
        {message && (
          <div className={`rounded-lg p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-900/40 border border-green-700 text-green-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Local backup */}
        <div className="card space-y-3">
          <h3 className="font-medium text-gray-300">Sauvegarde locale</h3>
          {settings?.lastLocalBackup && (
            <p className="text-xs text-gray-500">
              Dernier export : {new Date(settings.lastLocalBackup).toLocaleString('fr-FR')}
            </p>
          )}
          <button onClick={handleExport} className="btn-primary w-full">
            📤 Exporter en JSON
          </button>
          <button onClick={handleImport} className="btn-secondary w-full">
            📥 Importer un JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={handleFileChange} />
        </div>

        {/* GitHub backup */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-300">Sauvegarde GitHub</h3>
            <button onClick={() => setShowGhConfig(!showGhConfig)}
              className="text-xs text-indigo-400">
              {showGhConfig ? '▲ Fermer' : '⚙️ Config'}
            </button>
          </div>

          {showGhConfig && (
            <div className="space-y-2 pb-2">
              <div>
                <label className="label">Owner (username/org)</label>
                <input value={ghOwner} onChange={e => setGhOwner(e.target.value)}
                  className="input-field" placeholder="username" />
              </div>
              <div>
                <label className="label">Repo</label>
                <input value={ghRepo} onChange={e => setGhRepo(e.target.value)}
                  className="input-field" placeholder="training-data" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Branche</label>
                  <input value={ghBranch} onChange={e => setGhBranch(e.target.value)}
                    className="input-field" placeholder="main" />
                </div>
                <div>
                  <label className="label">Chemin du fichier</label>
                  <input value={ghPath} onChange={e => setGhPath(e.target.value)}
                    className="input-field" placeholder="data/backup.json" />
                </div>
              </div>
              <button onClick={saveGhConfig} className="btn-secondary w-full text-sm">
                💾 Sauvegarder la config
              </button>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => setModalAction('save')}
              disabled={!ghOwner || !ghRepo}
              className="btn-primary w-full disabled:opacity-50"
            >
              ☁️ Sauvegarder vers GitHub
            </button>
            <button
              onClick={() => setModalAction('restore')}
              disabled={!ghOwner || !ghRepo}
              className="btn-secondary w-full disabled:opacity-50"
            >
              🔄 Restaurer depuis GitHub
            </button>
            <button
              onClick={() => setModalAction('test')}
              disabled={!ghOwner || !ghRepo}
              className="btn-secondary w-full disabled:opacity-50 text-sm"
            >
              🔍 Tester la connexion
            </button>
          </div>
          {(!ghOwner || !ghRepo) && (
            <p className="text-xs text-gray-500">Configurez owner/repo pour utiliser GitHub.</p>
          )}
        </div>

        {/* Reset */}
        <div className="card">
          <h3 className="font-medium text-gray-300 mb-3">Données</h3>
          <button onClick={handleReset} className="btn-danger w-full">
            🗑 Effacer toutes les données
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Supprime irréversiblement toutes les séances, performances et réglages.
          </p>
        </div>

        {/* App info */}
        <div className="card text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-400">À propos</p>
          <p>Training Tracker v1.0.0</p>
          <p>Données stockées localement (IndexedDB)</p>
          <p>PWA — installable sur mobile et desktop</p>
        </div>
      </div>

      {modalAction && (
        <TokenModal
          title={
            modalAction === 'save' ? '☁️ Sauvegarder vers GitHub' :
            modalAction === 'restore' ? '🔄 Restaurer depuis GitHub' :
            '🔍 Tester la connexion'
          }
          onConfirm={handleGhAction}
          onClose={() => setModalAction(null)}
        />
      )}
    </PageLayout>
  )
}
