
import type { MediaItem } from '../types/media'
import MediaCard from './MediaCard'

interface MediaGridProps {
  items: MediaItem[]
  onItemClick: (item: MediaItem) => void
}

function MediaGrid({ items, onItemClick }: MediaGridProps) {

  return (
    <div className="media-grid">

      {items.map(item => (
        <MediaCard
          key={item.relativePath}
          item={item}
          onClick={onItemClick}
        />
      ))}

      {items.length === 0 && (
        <p className="empty-message">
          Dieser Ordner ist leer.
        </p>
      )}

    </div>
  )
}

export default MediaGrid
