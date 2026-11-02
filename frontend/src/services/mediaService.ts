import type { MediaItem } from '../types/media'

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