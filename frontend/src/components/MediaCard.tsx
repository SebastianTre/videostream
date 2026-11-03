
import type { MediaItem } from '../types/media'

interface MediaCardProps {
  item: MediaItem
  onClick: (item: MediaItem) => void
}

function MediaCard({ item, onClick }: MediaCardProps) {

  return (
    <div
      className="media-card"
      onClick={() => onClick(item)}
    >

      <div className={`media-card-image ${
        item.directory ? 'folder-image' : 'video-image'
      }`}>

        {item.directory ? (
          <div className="folder-placeholder">
            📁
          </div>
        ) : (
          <div className="video-placeholder">
            <span>▶</span>
          </div>
        )}

        {!item.directory && (
          <div className="media-card-play">
            ▶
          </div>
        )}

      </div>

      <div className="media-card-info">

        <div className="media-card-title">
          {item.name}
        </div>

        <div className="media-card-details">
          {item.directory
            ? 'Ordner'
            : formatSize(item.size)}
        </div>

      </div>

    </div>
  )
}

function formatSize(bytes: number): string {

  if (bytes === 0) return '0 Bytes'

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`
}

export default MediaCard
