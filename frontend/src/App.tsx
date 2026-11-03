
import { useEffect, useState } from 'react'
import {
  getMediaItems,
  getVideoStreamUrl
} from './services/mediaService'
import type { MediaItem } from './types/media'
import './App.css'

function App() {

  const [items, setItems] = useState<MediaItem[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aktuell ausgewähltes Video
  const [selectedVideo, setSelectedVideo] =
    useState<MediaItem | null>(null)

  async function loadMedia(path: string) {
    setLoading(true)
    setError(null)

    try {
      const data = await getMediaItems(path)
      setItems(data)
      setCurrentPath(path)
    } catch {
      setError('Medien konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMedia('')
  }, [])

  function openFolder(folder: MediaItem) {
    void loadMedia(folder.relativePath)
  }

  function navigateToPath(path: string) {
    void loadMedia(path)
  }

  // Video auswählen und Player anzeigen
  function playVideo(video: MediaItem) {
    setSelectedVideo(video)
  }

  // Player schließen und Medienübersicht anzeigen
  function closeVideo() {
    setSelectedVideo(null)
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const index = Math.floor(Math.log(bytes) / Math.log(1024))

    const size = bytes / Math.pow(1024, index)

    return `${size.toFixed(1)} ${units[index]}`
  }

  const pathParts = currentPath
    ? currentPath.split('/')
    : []

  return (
    <div className="app">

      <header className="header">
        <h1>🎬 VideoStream</h1>
      </header>

      <main className="content">

        {selectedVideo ? (

          <div className="video-player">

            <button
              className="back-button"
              onClick={closeVideo}
            >
              ← Zurück zur Medienübersicht
            </button>

            <h2>{selectedVideo.name}</h2>

            <video
              className="video-element"
              controls
              autoPlay
              playsInline
              src={getVideoStreamUrl(
                selectedVideo.relativePath
              )}
            >
              Dein Browser unterstützt keine Videowiedergabe.
            </video>

          </div>

        ) : (

          <>

            <nav className="breadcrumb">

              <button onClick={() => navigateToPath('')}>
                Medien
              </button>

              {pathParts.map((part, index) => {

                const path = pathParts
                  .slice(0, index + 1)
                  .join('/')

                return (
                  <span key={path}>
                    <span className="separator"> / </span>

                    <button onClick={() => navigateToPath(path)}>
                      {part}
                    </button>
                  </span>
                )
              })}

            </nav>

            <h2>
              {pathParts.length > 0
                ? pathParts[pathParts.length - 1]
                : 'Alle Medien'}
            </h2>

            {loading && <p>Medien werden geladen...</p>}

            {error && <p className="error">{error}</p>}

            {!loading && !error && (

              <div className="media-list">

                {items.map(item => (

                  <div
                    key={item.relativePath}
                    className="media-item"
                    onClick={() => {

                      if (item.directory) {
                        openFolder(item)
                      } else {
                        playVideo(item)
                      }

                    }}
                  >

                    <div className="media-icon">
                      {item.directory ? '📁' : '🎬'}
                    </div>

                    <div className="media-info">

                      <div className="media-name">
                        {item.name}
                      </div>

                      <div className="media-details">
                        {item.directory
                          ? 'Ordner'
                          : formatSize(item.size)}
                      </div>

                    </div>

                    {item.directory && (
                      <div className="media-arrow">
                        ›
                      </div>
                    )}

                  </div>

                ))}

                {items.length === 0 && (
                  <p>Dieser Ordner ist leer.</p>
                )}

              </div>

            )}

          </>

        )}

      </main>

    </div>
  )
}

export default App
