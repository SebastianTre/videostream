import type { MediaItem } from '../types/media'
import type { MediaMetadata } from '../types/media'

export async function getMediaItems(
  path: string = ''
): Promise<MediaItem[]> {

  const params = new URLSearchParams()

  if (path) {
    params.set('path', path)
  }

  const response = await fetch(
    `/api/media?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error('Medien konnten nicht geladen werden')
  }

  return response.json() as Promise<MediaItem[]>
}

export function getVideoStreamUrl(
  path: string
): string {

  const params = new URLSearchParams()

  params.set('path', path)

  return `/api/media/stream?${params.toString()}`
}

export async function getMediaMetadata(
  path: string,
  languages: readonly string[] = navigator.languages
): Promise<MediaMetadata> {

  const params = new URLSearchParams({
    path,
    languages: languages.join(',')
  })

  const response = await fetch(
    `/api/media/metadata?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error('Metadaten konnten nicht geladen werden.')
  }

  return response.json()
}


export interface HlsSession {
  sessionId: string
  playlistUrl: string
}

export interface HlsStartRequest {
  path: string
  audioTrackIndex?: number | null
}

export interface HlsAudioRequest {
  audioTrackIndex: number
  positionSeconds: number
}


/**
 * Startet eine neue HLS-Wiedergabesitzung.
 */

export async function startHlsSession(
  request: HlsStartRequest
): Promise<HlsSession> {

  const response = await fetch('/api/media/hls/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)

    throw new Error(
      error?.message ??
      `HLS-Stream konnte nicht gestartet werden (${response.status})`
    )
  }

  return response.json() as Promise<HlsSession>
}



/**
 * Wechselt die Audiospur einer bestehenden HLS-Sitzung.
 */
export async function switchHlsAudio(
  sessionId: string,
  request: HlsAudioRequest
): Promise<HlsSession> {

  const response = await fetch(
    `/api/media/hls/${encodeURIComponent(sessionId)}/audio`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    }
  )

  if (!response.ok) {
    throw new Error('Audiospur konnte nicht gewechselt werden')
  }

  return response.json() as Promise<HlsSession>
}


/**
 * Beendet eine HLS-Wiedergabesitzung.
 */
export async function stopHlsSession(
  sessionId: string
): Promise<void> {

  const response = await fetch(
    `/api/media/hls/${encodeURIComponent(sessionId)}`,
    {
      method: 'DELETE'
    }
  )

  if (!response.ok) {
    throw new Error('HLS-Sitzung konnte nicht beendet werden')
  }
}



export interface HlsSession {
  sessionId: string
  playlistUrl: string
}

export type AudioMode =
    | 'original'
    | 'none'
    | 'aac'

export interface HlsStartRequest {
  path: string
  audioTrackIndex?: number | null
  audioMode: AudioMode
}

export interface HlsAudioRequest {
  audioTrackIndex: number
  positionSeconds: number
}




