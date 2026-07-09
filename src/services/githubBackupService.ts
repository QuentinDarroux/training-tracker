import type { GithubBackupConfig, BackupData, TrainingConfig } from '../types'
import { validateImportData } from './backupService'
import { validateTrainingConfig } from './trainingConfigService'

const API_BASE = 'https://api.github.com'

interface GithubFileResponse {
  sha: string
  content: string
}

function normalizeConfig(config: GithubBackupConfig): GithubBackupConfig {
  return {
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    branch: config.branch.trim(),
    filePath: config.filePath.trim().replace(/^\/+/, ''),
    configFilePath: config.configFilePath?.trim().replace(/^\/+/, ''),
  }
}

function withFilePath(config: GithubBackupConfig, filePath: string): GithubBackupConfig {
  return normalizeConfig({ ...config, filePath })
}

function networkErrorMessage(error: unknown): Error | null {
  if (error instanceof TypeError) return new Error('Erreur réseau — vérifiez votre connexion.')
  return null
}

async function getFile(
  config: GithubBackupConfig,
  token: string,
): Promise<GithubFileResponse | null> {
  const normalizedConfig = normalizeConfig(config)
  const url = `${API_BASE}/repos/${normalizedConfig.owner}/${normalizedConfig.repo}/contents/${normalizedConfig.filePath}?ref=${normalizedConfig.branch}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(errorMessage(res.status, (msg as { message?: string }).message))
  }
  return res.json() as Promise<GithubFileResponse>
}

async function putJsonFile(
  config: GithubBackupConfig,
  token: string,
  data: unknown,
  message: string,
): Promise<void> {
  const normalizedConfig = normalizeConfig(config)
  const existing = await getFile(normalizedConfig, token)
  const json = JSON.stringify(data, null, 2)
  const content = btoa(unescape(encodeURIComponent(json)))
  const body: Record<string, unknown> = {
    message,
    content,
    branch: normalizedConfig.branch,
  }
  if (existing) body.sha = existing.sha

  const url = `${API_BASE}/repos/${normalizedConfig.owner}/${normalizedConfig.repo}/contents/${normalizedConfig.filePath}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const msg = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(errorMessage(res.status, (msg as { message?: string }).message))
  }
}

function errorMessage(status: number, msg?: string): string {
  if (status === 401) return 'Token invalide ou expiré.'
  if (status === 403) return 'Permissions insuffisantes. Vérifiez les droits du token (Contents read/write).'
  if (status === 404) return 'Repo ou fichier introuvable. Vérifiez owner/repo/branch.'
  if (status === 409) return 'Conflit GitHub — réessayez (sha désynchronisé).'
  if (status === 422) return 'Données invalides envoyées à GitHub.'
  return msg ?? `Erreur GitHub (${status}).`
}

export async function saveToGithub(
  config: GithubBackupConfig,
  token: string,
  data: BackupData,
): Promise<void> {
  try {
    const now = new Date()
    const commitMsg = `Update training backup ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    await putJsonFile(config, token, data, commitMsg)
  } catch (e) {
    const networkError = networkErrorMessage(e)
    if (networkError) throw networkError
    throw e
  }
}

export async function restoreFromGithub(
  config: GithubBackupConfig,
  token: string,
): Promise<BackupData> {
  try {
    const file = await getFile(config, token)
    if (!file) throw new Error('Aucune sauvegarde trouvée dans ce repo.')
    const json = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))))
    const data = JSON.parse(json) as BackupData
    if (!validateImportData(data)) {
      throw new Error('Le fichier distant ne semble pas être une sauvegarde Training Tracker valide.')
    }
    return data
  } catch (e) {
    const networkError = networkErrorMessage(e)
    if (networkError) throw networkError
    throw e
  }
}

export async function saveConfigToGithub(
  config: GithubBackupConfig,
  token: string,
  data: TrainingConfig,
): Promise<void> {
  try {
    const configPath = config.configFilePath ?? 'public/data/training-config.json'
    await putJsonFile(withFilePath(config, configPath), token, data, 'Update training configuration')
  } catch (e) {
    const networkError = networkErrorMessage(e)
    if (networkError) throw networkError
    throw e
  }
}

export async function restoreConfigFromGithub(
  config: GithubBackupConfig,
  token: string,
): Promise<TrainingConfig> {
  try {
    const configPath = config.configFilePath ?? 'public/data/training-config.json'
    const file = await getFile(withFilePath(config, configPath), token)
    if (!file) throw new Error('Aucune configuration trouvée dans ce repo.')
    const json = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))))
    const data = JSON.parse(json) as TrainingConfig
    if (!validateTrainingConfig(data)) {
      throw new Error('Le fichier distant ne semble pas être une configuration Training Tracker valide.')
    }
    return data
  } catch (e) {
    const networkError = networkErrorMessage(e)
    if (networkError) throw networkError
    throw e
  }
}

export async function testConnection(
  config: GithubBackupConfig,
  token: string,
): Promise<string> {
  try {
    const normalizedConfig = normalizeConfig(config)
    const url = `${API_BASE}/repos/${normalizedConfig.owner}/${normalizedConfig.repo}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })
    if (!res.ok) {
      const msg = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(errorMessage(res.status, (msg as { message?: string }).message))
    }
    const info = await res.json() as { full_name: string; private: boolean }
    return `Connecté à ${info.full_name} (${info.private ? 'privé' : 'public'})`
  } catch (e) {
    const networkError = networkErrorMessage(e)
    if (networkError) throw networkError
    throw e
  }
}
