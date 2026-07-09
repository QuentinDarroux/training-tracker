import type { GithubBackupConfig, BackupData } from '../types'

const API_BASE = 'https://api.github.com'

interface GithubFileResponse {
  sha: string
  content: string
}

async function getFile(
  config: GithubBackupConfig,
  token: string,
): Promise<GithubFileResponse | null> {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${config.filePath}?ref=${config.branch}`
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
    const existing = await getFile(config, token)
    const json = JSON.stringify(data, null, 2)
    const content = btoa(unescape(encodeURIComponent(json)))
    const now = new Date()
    const commitMsg = `Update training backup ${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

    const body: Record<string, unknown> = {
      message: commitMsg,
      content,
      branch: config.branch,
    }
    if (existing) body.sha = existing.sha

    const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${config.filePath}`
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
  } catch (e) {
    if (e instanceof TypeError && e.message.includes('fetch')) {
      throw new Error('Erreur réseau — vérifiez votre connexion.')
    }
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
    if (!data.version || !Array.isArray(data.sessions)) {
      throw new Error('Le fichier distant ne semble pas être une sauvegarde Training Tracker valide.')
    }
    return data
  } catch (e) {
    if (e instanceof TypeError && e.message.includes('fetch')) {
      throw new Error('Erreur réseau — vérifiez votre connexion.')
    }
    throw e
  }
}

export async function testConnection(
  config: GithubBackupConfig,
  token: string,
): Promise<string> {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}`
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
}
