
export interface MediaItem {
  name: string
  relativePath: string
  directory: boolean
  size: number
}

export interface VideoStream {
  index: number
  codec: string | null
  codecLongName: string | null
  profile: string | null
  width: number | null
  height: number | null
  frameRate: string | null
  pixelFormat: string | null
  aspectRatio: string | null
  bitrate: number | null
}

export interface AudioTrack {
  index: number
  codec: string | null
  codecLongName: string | null
  profile: string | null
  language: string | null
  title: string | null
  channels: number | null
  channelLayout: string | null
  sampleRate: number | null
  bitrate: number | null
  defaultTrack: boolean
  forced: boolean
  commentary: boolean
  original: boolean
  hearingImpaired: boolean
}

export interface SubtitleTrack {
  index: number
  codec: string | null
  codecLongName: string | null
  language: string | null
  title: string | null
  defaultTrack: boolean
  forced: boolean
  textBased: boolean
}

export interface MediaMetadata {
  filename: string
  size: number
  duration: number

  formatName: string | null
  formatLongName: string | null
  bitrate: number | null

  videoStreams: VideoStream[]
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrack[]
}
