import { useState, useRef } from 'react'
import PageLayout from '../components/PageLayout'
import TokenModal from '../components/TokenModal'
import SegmentedControl from '../components/SegmentedControl'
import type { UserSettings, GithubBackupConfig, TrainingConfig } from '../types'
import { exportData, downloadJson, validateImportData, importData } from '../services/backupService'
import {
  restoreConfigFromGithub,
  saveConfigToGithub,
  saveToGithub,
  restoreFromGithub,
  testConnection,
} from '../services/githubBackupService'
import { resetAllData, saveSettings } from '../services/storageService'
import {
  applyTrainingConfig,
  exportTrainingConfig,
  getTrainingConfigValidationErrors,
  trainingConfigPrompt,
} from '../services/trainingConfigService'

interface Props {
  settings: UserSettings | null
  onReload: () => Promise<void>
  onUpdateSettings: (s: UserSettings) => Promise<void>
}

type ModalAction = 'save' | 'restore' | 'test' | 'push-config' | 'pull-config' | null

export default function SettingsPage({ settings, onReload, onUpdateSettings }: Props) {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [rebuildNotice, setRebuildNotice] = useState<string | null>(null)
  const [modalAction, setModalAction] = useState<ModalAction>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // GitHub config (non-token fields)
  const ghConfig = settings?.githubBackup
  const [ghOwner, setGhOwner] = useState(ghConfig?.owner ?? '')
  const [ghRepo, setGhRepo] = useState(ghConfig?.repo ?? '')
  const [ghBranch, setGhBranch] = useState(ghConfig?.branch ?? 'main')
  const [ghPath, setGhPath] = useState(ghConfig?.filePath ?? 'data/training-backup.json')
  const [ghConfigPath, setGhConfigPath] = useState(ghConfig?.configFilePath ?? 'public/data/training-config.json')
  const [showGhConfig, setShowGhConfig] = useState(false)
  const [showTrainingConfig, setShowTrainingConfig] = useState(false)
  const [trainingConfigText, setTrainingConfigText] = useState(() =>
    JSON.stringify(exportTrainingConfig(settings), null, 2)
  )

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
      owner: ghOwner.trim(),
      repo: ghRepo.trim(),
      branch: ghBranch.trim(),
      filePath: ghPath.trim().replace(/^\/+/, ''),
      configFilePath: ghConfigPath.trim().replace(/^\/+/, ''),
    }
    const updated: UserSettings = { ...settings, githubBackup: config }
    await saveSettings(updated)
    await onUpdateSettings(updated)
    showMsg('Configuration sauvegardée')
    setShowGhConfig(false)
  }

  const getGhConfig = (): GithubBackupConfig | null => {
    const config: GithubBackupConfig = {
      owner: ghOwner.trim(),
      repo: ghRepo.trim(),
      branch: ghBranch.trim(),
      filePath: ghPath.trim().replace(/^\/+/, ''),
      configFilePath: ghConfigPath.trim().replace(/^\/+/, ''),
    }
    if (!config.owner || !config.repo) return null
    return config
  }

  const handleGhAction = async (token: string) => {
    const config = getGhConfig()
    if (!config) throw new Error('Configurez d\'abord owner/repo GitHub')

    // On error, this throws and TokenModal's own catch displays it inline
    // (the modal stays open). Only close the modal after a real success —
    // closing it unconditionally in a `finally` here would unmount
    // TokenModal before it gets a chance to show the error.
    if (modalAction === 'test') {
      const msg = await testConnection(config, token)
      showMsg(msg)
    } else if (modalAction === 'save') {
      const data = await exportData()
      const trainingConfig = exportTrainingConfig(settings)
      await saveToGithub(config, token, data)
      await saveConfigToGithub(config, token, trainingConfig)
      if (settings) {
        await onUpdateSettings({ ...settings, lastLocalBackup: new Date().toISOString() })
      }
      setRebuildNotice('Sauvegarde complète poussée : données + training-config.json. Si la config a changé, attends la fin du rebuild GitHub Actions puis recharge l’app. La date de build au-dessus de la barre du bas doit changer.')
      showMsg('Sauvegarde GitHub complète réussie !')
    } else if (modalAction === 'restore') {
      const data = await restoreFromGithub(config, token)
      if (!confirm('Restaurer depuis GitHub ? Les données seront fusionnées.')) return
      await importData(data)
      await onReload()
      showMsg('Restauration GitHub réussie !')
    } else if (modalAction === 'push-config') {
      const parsed = parseTrainingConfigText()
      await saveConfigToGithub(config, token, parsed)
      setRebuildNotice('Configuration poussée dans GitHub. Attends le rebuild/déploiement GitHub Actions puis recharge l’app. La date de build au-dessus de la barre du bas doit changer.')
      showMsg('Configuration poussée vers GitHub. Attendez le rebuild avant de recharger.')
    } else if (modalAction === 'pull-config') {
      if (!settings) throw new Error('Réglages indisponibles.')
      const remoteConfig = await restoreConfigFromGithub(config, token)
      const updated = applyTrainingConfig(settings, remoteConfig)
      await onUpdateSettings(updated)
      setTrainingConfigText(JSON.stringify(remoteConfig, null, 2))
      showMsg('Configuration entraînements restaurée depuis GitHub.')
    }
    setModalAction(null)
  }

  const refreshTrainingConfigText = () => {
    setTrainingConfigText(JSON.stringify(exportTrainingConfig(settings), null, 2))
  }

  const applyTrainingConfigText = async () => {
    if (!settings) return
    try {
      const parsed = parseTrainingConfigText()
      const updated = applyTrainingConfig(settings, parsed)
      await onUpdateSettings(updated)
      showMsg('Configuration appliquée localement.')
    } catch (error) {
      showMsg(error instanceof Error ? error.message : 'Configuration entraînements invalide', 'error')
    }
  }

  const updateTheme = async (theme: UserSettings['theme']) => {
    if (!settings) return
    await onUpdateSettings({ ...settings, theme })
    showMsg('Thème mis à jour.')
  }

  const copyTrainingConfigPrompt = async () => {
    try {
      await navigator.clipboard.writeText(trainingConfigPrompt())
      showMsg('Prompt LLM copié dans le presse-papiers.')
    } catch {
      showMsg('Impossible de copier le prompt dans le presse-papiers.', 'error')
    }
  }

  const parseTrainingConfigText = (): TrainingConfig => {
    let parsed: unknown
    try {
      parsed = JSON.parse(trainingConfigText)
    } catch {
      throw new Error('JSON invalide dans la configuration entraînements.')
    }
    const errors = getTrainingConfigValidationErrors(parsed)
    if (errors.length > 0) {
      throw new Error(`Configuration entraînements invalide : ${errors.slice(0, 5).join(' ')}`)
    }
    return parsed as TrainingConfig
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

        {rebuildNotice && (
          <div className="card border-indigo-600/50 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-indigo-300">Rebuild requis</p>
                <p className="text-sm text-gray-500 mt-1">{rebuildNotice}</p>
              </div>
              <button
                onClick={() => setRebuildNotice(null)}
                className="text-sm text-gray-500 hover:text-gray-300"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Appearance */}
        <div className="card space-y-3">
          <div>
            <h3 className="font-medium text-gray-300">Apparence</h3>
            <p className="text-xs text-gray-500 mt-1">
              Le mode système suit automatiquement le thème clair/sombre du téléphone.
            </p>
          </div>
          <SegmentedControl
            value={settings?.theme ?? 'system'}
            onChange={updateTheme}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
            ]}
          />
        </div>

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
                  <label className="label">Chemin backup données</label>
                  <input value={ghPath} onChange={e => setGhPath(e.target.value)}
                    className="input-field" placeholder="data/backup.json" />
                </div>
              </div>
              <div>
                <label className="label">Chemin config entraînements</label>
                <input value={ghConfigPath} onChange={e => setGhConfigPath(e.target.value)}
                  className="input-field" placeholder="data/training-config.json" />
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
              ☁️ Sauvegarder config + data vers GitHub
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

        {/* Training config */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-300">Config entraînements</h3>
            <button
              onClick={() => {
                if (!showTrainingConfig) refreshTrainingConfigText()
                setShowTrainingConfig(!showTrainingConfig)
              }}
              className="text-xs text-indigo-400"
            >
              {showTrainingConfig ? '▲ Fermer' : '⚙️ JSON'}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Modifie le planning + les entraînements via JSON, puis pousse <code>{ghConfigPath}</code> dans GitHub.
            Après push, attends le rebuild GitHub Actions avant de recharger l’app.
          </p>

          {showTrainingConfig && (
            <div className="space-y-2">
              <textarea
                value={trainingConfigText}
                onChange={e => setTrainingConfigText(e.target.value)}
                className="input-field font-mono text-xs min-h-[260px]"
                spellCheck={false}
              />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={refreshTrainingConfigText} className="btn-secondary text-sm">
                  ↻ Recharger local
                </button>
                <button onClick={applyTrainingConfigText} className="btn-secondary text-sm">
                  ✅ Appliquer local
                </button>
              </div>
              <button onClick={copyTrainingConfigPrompt} className="btn-secondary w-full text-sm">
                📋 Copier prompt LLM pour générer ce JSON
              </button>
              <button
                onClick={() => setModalAction('push-config')}
                disabled={!ghOwner || !ghRepo}
                className="btn-primary w-full disabled:opacity-50"
              >
                🚀 Pousser training-config.json
              </button>
              <button
                onClick={() => setModalAction('pull-config')}
                disabled={!ghOwner || !ghRepo}
                className="btn-secondary w-full disabled:opacity-50"
              >
                📥 Restaurer training-config.json
              </button>
            </div>
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
            modalAction === 'push-config' ? '🚀 Pousser training-config.json' :
            modalAction === 'pull-config' ? '📥 Restaurer training-config.json' :
            '🔍 Tester la connexion'
          }
          onConfirm={handleGhAction}
          onClose={() => setModalAction(null)}
        />
      )}
    </PageLayout>
  )
}
