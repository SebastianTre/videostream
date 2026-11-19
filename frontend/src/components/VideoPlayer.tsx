
import {
  useEffect,
  useRef,
  useState
} from 'react'

import type { ChangeEvent } from 'react'

import Hls from 'hls.js'

import type {
  MediaItem,
  MediaMetadata
} from '../types/media'

import {
  getMediaMetadata,
  startHlsSession,
  switchHlsAudio,
  stopHlsSession
} from '../services/mediaService'

import MediaTechnicalInfo from './MediaTechnicalInfo'

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

    if (!saved) return DEFAULT_SETTINGS

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
  const hlsRef = useRef<Hls | null>(null)

  const sessionIdRef = useRef<string | null>(null)

  // Absolute Position innerhalb der ursprünglichen Videodatei.
  const timelineOffsetRef = useRef(0)

  const lastSavedTime = useRef(0)

  const [metadata, setMetadata] =
    useState<MediaMetadata | null>(null)

  const [metadataLoading, setMetadataLoading] = useState(true)
  const [metadataError, setMetadataError] =
    useState<string | null>(null)

  const [hlsLoading, setHlsLoading] = useState(true)
  const [hlsError, setHlsError] = useState<string | null>(null)

  const [selectedAudioTrack, setSelectedAudioTrack] =
    useState<number | null>(null)

  const [audioSwitching, setAudioSwitching] = useState(false)

  const progressKey =
    `videostream-progress:${video.relativePath}`

  // --------------------------------------------------
  // Metadaten laden
  // --------------------------------------------------

  useEffect(() => {

    let cancelled = false

    async function loadMetadata() {

      setMetadata(null)
      setMetadataLoading(true)
      setMetadataError(null)

      try {

        const result = await getMediaMetadata(
          video.relativePath,
          navigator.languages
        )

        if (!cancelled) {
          setMetadata(result)
          setSelectedAudioTrack(
            result.selectedAudioTrackIndex
          )
        }

      } catch {

        if (!cancelled) {
          setMetadataError(
            'Technische Medieninformationen konnten nicht geladen werden.'
          )
        }

      } finally {

        if (!cancelled) {
          setMetadataLoading(false)
        }
      }
    }

    void loadMetadata()

    return () => {
      cancelled = true
    }

  }, [video.relativePath])

  // --------------------------------------------------
  // Player-Einstellungen wiederherstellen
  // --------------------------------------------------

  useEffect(() => {

    const player = videoRef.current

    if (!player) return

    const settings = getPlayerSettings()

    player.volume = settings.volume
    player.muted = settings.muted

  }, [video.relativePath])

  // --------------------------------------------------
  // Wiedergabeposition wiederherstellen
  // --------------------------------------------------

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

      console.warn(
        'Wiedergabeposition konnte nicht geladen werden.'
      )
    }
  }

  // --------------------------------------------------
  // Wiedergabeposition speichern
  // --------------------------------------------------

  function saveProgress(force = false) {

    const player = videoRef.current

    if (!player || !Number.isFinite(player.currentTime)) {
      return
    }

    const currentTime =
      timelineOffsetRef.current + player.currentTime

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

      console.warn(
        'Wiedergabeposition konnte nicht gespeichert werden.'
      )
    }
  }

  // --------------------------------------------------
  // Player-Einstellungen speichern
  // --------------------------------------------------

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

      console.warn(
        'Player-Einstellungen konnten nicht gespeichert werden.'
      )
    }
  }

  // --------------------------------------------------
  // HLS-Sitzung starten
  // --------------------------------------------------

  useEffect(() => {

    if (!metadata) return

    let cancelled = false

    async function startPlayback() {

      const player = videoRef.current

      if (!player) return

      setHlsLoading(true)
      setHlsError(null)

      let sessionId: string | null = null

      try {

        const session = await startHlsSession({
          path: video.relativePath,
          audioTrackIndex: metadata!.selectedAudioTrackIndex,
          audioMode: 'AAC'
        })

        sessionId = session.sessionId

        if (cancelled) {
          await stopHlsSession(sessionId)
          return
        }

        sessionIdRef.current = sessionId

        const playlistUrl = session.playlistUrl

        // Native HLS-Unterstützung bevorzugen.
        if (player.canPlayType(
          'application/vnd.apple.mpegurl'
        )) {

          player.src = playlistUrl
          player.load()

        } else if (Hls.isSupported()) {

          const hls = new Hls()

          hlsRef.current = hls

          hls.on(Hls.Events.ERROR, (_, data) => {

            if (data.fatal) {

              console.error('HLS-Fehler:', data)

              setHlsError(
                'Die HLS-Wiedergabe konnte nicht fortgesetzt werden.'
              )

              hls.destroy()
              hlsRef.current = null
            }
          })

          hls.attachMedia(player)

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(playlistUrl)
          })

        } else {

          throw new Error(
            'Dieser Browser unterstützt keine HLS-Wiedergabe.'
          )
        }

      } catch (error) {

        console.error('HLS-Start fehlgeschlagen:', error)

          if (!cancelled) {
            setHlsError(
              error instanceof Error
                ? error.message
                : 'Unbekannter Fehler beim Starten des Videostreams.'
            )
          }

        if (sessionId) {
          await stopHlsSession(sessionId)
        }

      } finally {

        if (!cancelled) {
          setHlsLoading(false)
        }
      }
    }

    void startPlayback()

    return () => {

      cancelled = true

      hlsRef.current?.destroy()
      hlsRef.current = null

      const sessionId = sessionIdRef.current
      sessionIdRef.current = null

      if (sessionId) {
        void stopHlsSession(sessionId).catch(console.error)
      }
    }

  }, [metadata, video.relativePath])

  // --------------------------------------------------
  // Audiospur wechseln
  // --------------------------------------------------

  async function handleAudioTrackChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {

    const player = videoRef.current
    const sessionId = sessionIdRef.current

    if (!player || !sessionId) return

    const audioTrackIndex = Number(event.target.value)

    if (!Number.isInteger(audioTrackIndex)) return

    const currentPosition =
      timelineOffsetRef.current + player.currentTime

    const wasPlaying = !player.paused

    setAudioSwitching(true)
    setHlsError(null)

    try {

      const session = await switchHlsAudio(
        sessionId,
        {
          audioTrackIndex,
          positionSeconds: currentPosition
        }
      )

      // FFmpeg beginnt nach -ss bei Zeitposition 0.
      timelineOffsetRef.current = currentPosition
      lastSavedTime.current = currentPosition

      setSelectedAudioTrack(audioTrackIndex)

      // Alten HLS-Stream freigeben.
      hlsRef.current?.destroy()
      hlsRef.current = null

      player.pause()
      player.removeAttribute('src')
      player.load()

      const playlistUrl =
        `${session.playlistUrl}?t=${Date.now()}`

      if (player.canPlayType(
        'application/vnd.apple.mpegurl'
      )) {

        player.src = playlistUrl
        player.load()

      } else if (Hls.isSupported()) {

        const hls = new Hls()

        hlsRef.current = hls

        hls.on(Hls.Events.ERROR, (_, data) => {

          if (data.fatal) {
            setHlsError(
              'Fehler beim Laden der neuen Audiospur.'
            )

            hls.destroy()
            hlsRef.current = null
          }
        })

        hls.attachMedia(player)

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(playlistUrl)
        })

      } else {

        throw new Error('HLS wird nicht unterstützt.')
      }

      if (wasPlaying) {
        player.addEventListener(
          'canplay',
          () => {
            void player.play().catch(console.error)
          },
          { once: true }
        )
      }

    } catch (error) {

      console.error(error)

      setHlsError(
        'Die Audiospur konnte nicht gewechselt werden.'
      )

    } finally {

      setAudioSwitching(false)
    }
  }

  // --------------------------------------------------
  // Wiedergabe abgeschlossen
  // --------------------------------------------------

  function handleEnded() {

    try {
      localStorage.removeItem(progressKey)
    } catch {
      console.warn(
        'Wiedergabeposition konnte nicht gelöscht werden.'
      )
    }

    lastSavedTime.current = 0
    timelineOffsetRef.current = 0
  }

  // --------------------------------------------------
  // Player schließen
  // --------------------------------------------------

  function handleClose() {

    saveProgress(true)
    onClose()
  }

  return (
    <div className="video-player">

      <button
        className="back-button"
        onClick={handleClose}
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
        onLoadedMetadata={restoreProgress}
        onTimeUpdate={() => saveProgress()}
        onPause={() => saveProgress(true)}
        onSeeked={() => saveProgress(true)}
        onVolumeChange={savePlayerSettings}
        onEnded={handleEnded}
      >
        Dein Browser unterstützt keine Videowiedergabe.
      </video>

      {hlsLoading && (
        <p>Videostream wird vorbereitet...</p>
      )}

      {hlsError && (
        <p className="error">{hlsError}</p>
      )}

      {/* Audiospur-Auswahl */}

      {metadata && metadata.audioTracks.length > 0 && (

        <div className="audio-track-selector">

          <label htmlFor="audio-track">
            Audiospur:
          </label>

          <select
            id="audio-track"
            value={selectedAudioTrack ?? ''}
            onChange={handleAudioTrackChange}
            disabled={audioSwitching || hlsLoading}
          >

            {metadata.audioTracks.map(track => (

              <option
                key={track.index}
                value={track.index}
              >
                {track.language ?? 'Unbekannt'}
                {' – '}
                {track.title ?? track.codec ?? 'Audiospur'}
                {track.defaultTrack ? ' (Standard)' : ''}
              </option>

            ))}

          </select>

          {audioSwitching && (
            <span> Audiospur wird gewechselt...</span>
          )}

        </div>
      )}

      {/* Technische Medieninformationen */}

      <div className="media-metadata-container">

        {metadataLoading && (
          <p>Medieninformationen werden geladen...</p>
        )}

        {metadataError && (
          <p className="error">{metadataError}</p>
        )}

        {metadata && (
          <MediaTechnicalInfo metadata={metadata} />
        )}

      </div>

    </div>
  )
}

export default VideoPlayer
