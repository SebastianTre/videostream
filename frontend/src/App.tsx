
import { useEffect, useState } from 'react'
import {
  getMediaItems,
  getVideoStreamUrl
} from './services/mediaService'
import type { MediaItem } from './types/media'
import Header from './components/Header'
import MediaGrid from './components/MediaGrid'
import './App.css'

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'size-asc'
  | 'size-desc'

function App() {

  const [items, setItems] = useState<MediaItem[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] =
    useState<SortOption>('name-asc')

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
      setSearchTerm('')
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

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(
      searchTerm.toLowerCase()
    )
  )

  const sortedItems = [...filteredItems].sort((a, b) => {

    // Ordner immer zuerst
    if (a.directory !== b.directory) {
      return a.directory ? -1 : 1
    }

    switch (sortOption) {

      case 'name-asc':
        return a.name.localeCompare(b.name, 'de', {
          sensitivity: 'base'
        })

      case 'name-desc':
        return b.name.localeCompare(a.name, 'de', {
          sensitivity: 'base'
        })

      case 'size-asc':
        return a.size - b.size

      case 'size-desc':
        return b.size - a.size

      default:
        return 0
    }
  })

  return (
    <div className="app">

      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

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

              <>

                <div className="media-toolbar">

                  <div className="media-count">
                    {sortedItems.length} Einträge
                  </div>

                  <div className="sort-control">

                    <label htmlFor="media-sort">
                      Sortieren:
                    </label>

                    <select
                      id="media-sort"
                      value={sortOption}
                      onChange={(event) =>
                        setSortOption(event.target.value as SortOption)
                      }
                    >
                      <option value="name-asc">Name (A–Z)</option>
                      <option value="name-desc">Name (Z–A)</option>
                      <option value="size-asc">Größe (klein–groß)</option>
                      <option value="size-desc">Größe (groß–klein)</option>
                    </select>

                  </div>

                </div>

                <MediaGrid
                  items={sortedItems}
                  onItemClick={(item) => {
                    if (item.directory) {
                      openFolder(item)
                    } else {
                      playVideo(item)
                    }
                  }}
                />

              </>

            )}


          </>

        )}

      </main>

    </div>
  )
}

export default App
