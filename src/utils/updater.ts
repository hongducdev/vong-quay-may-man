import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater'

export interface UpdateInfo {
  available: boolean
  currentVersion: string
  version: string
  date?: string
  body?: string
}

export type UpdateProgressCallback = (percent: number, status: string) => void

let cachedUpdate: Update | null = null

/**
 * Check if a new version is available from GitHub Releases.
 * Returns UpdateInfo if available, or null if already up to date.
 */
export async function checkForAppUpdates(): Promise<UpdateInfo | null> {
  try {
    const update = await check()
    if (!update) {
      cachedUpdate = null
      return null
    }

    cachedUpdate = update
    return {
      available: true,
      currentVersion: update.currentVersion,
      version: update.version,
      date: update.date,
      body: update.body,
    }
  } catch {
    // If offline or network error, return null safely without crashing
    cachedUpdate = null
    return null
  }
}

/**
 * Download and install the update.
 * On Windows, this will automatically run the installer and restart the app.
 */
export async function installAppUpdate(onProgress?: UpdateProgressCallback): Promise<void> {
  if (!cachedUpdate) {
    throw new Error('Chưa có bản cập nhật nào được tải.')
  }

  let totalBytes = 0
  let downloadedBytes = 0

  await cachedUpdate.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === 'Started') {
      totalBytes = event.data.contentLength || 0
      onProgress?.(0, 'Bắt đầu tải bản cập nhật...')
    } else if (event.event === 'Progress') {
      downloadedBytes += event.data.chunkLength
      if (totalBytes > 0) {
        const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
        onProgress?.(percent, `Đang tải: ${percent}% (${(downloadedBytes / (1024 * 1024)).toFixed(1)} / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`)
      } else {
        onProgress?.(50, `Đang tải: ${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB`)
      }
    } else if (event.event === 'Finished') {
      onProgress?.(100, 'Đang cài đặt và chuẩn bị khởi động lại...')
    }
  })
}
