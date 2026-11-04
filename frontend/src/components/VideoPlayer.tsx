
import { useEffect, useRef } from 'react'
import type { MediaItem } from '../types/media'
import { getVideoStreamUrl } from '../services/mediaService'

interface VideoPlayerProps {
  video: MediaItem
  onClose: () => void
}

interface PlayerSettings {
  volume: number
  muted: boolean
}

const SETTINGS_KEY = 'videostream-player-settings'

const DEFAULT_SETTINGS: PlayerSettings = {
  volume: 1,
  muted: false
}

function getPlayerSettings(): PlayerSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)

    if (!saved) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(saved)

    return {
      volume:
        typeof parsed.volume === 'number' &&
        parsed.volume >= 0 &&
        parsed.volume <= 1
          ? parsed.volume
          : 1,

      muted:
        typeof parsed.muted === 'boolean'
          ? parsed.muted
          : false
    }

  } catch {
    return DEFAULT_SETTINGS
  }
}

function VideoPlayer({ video, onClose }: VideoPlayerProps) {

  const videoRef = useRef<HTMLVideoElement>(null)

  const lastSavedTime = useRef(0)

  const progressKey =
    `videostream-progress:${video.relativePath}`

  // Player-Einstellungen beim Öffnen wiederherstellen
  useEffect(() => {

    const player = videoRef.current

    if (!player) return

    const settings = getPlayerSettings()

    player.volume = settings.volume
    player.muted = settings.muted

  }, [video.relativePath])

  // Wiedergabeposition wiederherstellen
  function restoreProgress() {

    const player = videoRef.current

    if (!player) return

    try {
      const savedProgress = localStorage.getItem(progressKey)

      if (!savedProgress) return

      const position = Number(savedProgress)

      if (
        Number.isFinite(position) &&
        position > 0 &&
        position < player.duration
      ) {
        player.currentTime = position
        lastSavedTime.current = position
      }

    } catch {
      console.warn('Wiedergabeposition konnte nicht geladen werden.')
    }
  }

  // Wiedergabeposition speichern
  function saveProgress(force = false) {

    const player = videoRef.current

    if (!player || !Number.isFinite(player.currentTime)) {
      return
    }

    const currentTime = player.currentTime

    // Nur alle 5 Sekunden speichern
    if (
      !force &&
      currentTime - lastSavedTime.current < 5
    ) {
      return
    }

    try {
      localStorage.setItem(
        progressKey,
        String(currentTime)
      )

      lastSavedTime.current = currentTime

    } catch {
      console.warn('Wiedergabeposition konnte nicht gespeichert werden.')
    }
  }

  // Lautstärke und Stummschaltung speichern
  function savePlayerSettings() {

    const player = videoRef.current

    if (!player) return

    const settings: PlayerSettings = {
      volume: player.volume,
      muted: player.muted
    }

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      )
    } catch {
      console.warn('Player-Einstellungen konnten nicht gespeichert werden.')
    }
  }

  // Wiedergabe vollständig abgeschlossen
  function handleEnded() {

    try {
      localStorage.removeItem(progressKey)
    } catch {
      console.warn('Wiedergabeposition konnte nicht gelöscht werden.')
    }

    lastSavedTime.current = 0
  }

  return (
    <div className="video-player">

      <button
        className="back-button"
        onClick={() => {
          saveProgress(true)
          onClose()
        }}
      >
        ← Zurück zur Medienübersicht
      </button>

      <h2>{video.name}</h2>

      <video
        ref={videoRef}
        key={video.relativePath}
        className="video-element"
        controls
        autoPlay
        playsInline
        src={getVideoStreamUrl(video.relativePath)}
        onLoadedMetadata={restoreProgress}
        onTimeUpdate={() => saveProgress()}
        onPause={() => saveProgress(true)}
        onSeeked={() => saveProgress(true)}
        onVolumeChange={savePlayerSettings}
        onEnded={handleEnded}
      >
        Dein Browser unterstützt keine Videowiedergabe.
      </video>

    </div>
  )
}

export default VideoPlayer
