
import { useEffect, useState } from 'react'
import {
  getMediaItems,
  getVideoStreamUrl
} from './services/mediaService'
import type { MediaItem } from './types/media'
import Header from './components/Header'
import MediaGrid from './components/MediaGrid'
import VideoPlayer from './components/VideoPlayer'
import './App.css'

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'size-asc'
  | 'size-desc'

interface AppState {
  currentPath: string
  selectedVideo: MediaItem | null
  searchTerm: string
  sortOption: SortOption
}

const STORAGE_KEY = 'videostream-app-state'

function getInitialState(): AppState {
  const defaultState: AppState = {
    currentPath: '',
    selectedVideo: null,
    searchTerm: '',
    sortOption: 'name-asc'
  }

  try {
    const savedState = localStorage.getItem(STORAGE_KEY)

    if (!savedState) {
      return defaultState
    }

    const parsed = JSON.parse(savedState) as Partial<AppState>

    const validSortOptions: SortOption[] = [
      'name-asc',
      'name-desc',
      'size-asc',
      'size-desc'
    ]

    return {
      currentPath:
        typeof parsed.currentPath === 'string'
          ? parsed.currentPath
          : '',

      selectedVideo:
        parsed.selectedVideo &&
        typeof parsed.selectedVideo.relativePath === 'string' &&
        typeof parsed.selectedVideo.name === 'string' &&
        parsed.selectedVideo.directory === false
          ? parsed.selectedVideo
          : null,

      searchTerm:
        typeof parsed.searchTerm === 'string'
          ? parsed.searchTerm
          : '',

      sortOption:
        validSortOptions.includes(parsed.sortOption as SortOption)
          ? parsed.sortOption as SortOption
          : 'name-asc'
    }

  } catch {
    return defaultState
  }
}

function App() {

  const [initialState] = useState(getInitialState)

  const [items, setItems] = useState<MediaItem[]>([])
  const [currentPath, setCurrentPath] =
    useState(initialState.currentPath)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] =
    useState(initialState.searchTerm)

  const [sortOption, setSortOption] =
    useState<SortOption>(initialState.sortOption)

  const [selectedVideo, setSelectedVideo] =
    useState<MediaItem | null>(initialState.selectedVideo)

  // Medienordner laden
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

  // Initialen Ordner laden
  useEffect(() => {
    void loadMedia(initialState.currentPath)
  }, [])

  // Anwendungszustand speichern
  useEffect(() => {

    const appState: AppState = {
      currentPath,
      selectedVideo,
      searchTerm,
      sortOption
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(appState)
    )

  }, [
    currentPath,
    selectedVideo,
    searchTerm,
    sortOption
  ])

  function openFolder(folder: MediaItem) {
    setSelectedVideo(null)
    setSearchTerm('')
    void loadMedia(folder.relativePath)
  }

  function navigateToPath(path: string) {
    setSelectedVideo(null)
    setSearchTerm('')
    void loadMedia(path)
  }

  function playVideo(video: MediaItem) {
    setSelectedVideo(video)
  }

  function closeVideo() {
    setSelectedVideo(null)
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

          <VideoPlayer
              video={selectedVideo}
              onClose={closeVideo}
          />

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
