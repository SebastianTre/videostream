
import type { MediaMetadata } from '../types/media'

interface MediaTechnicalInfoProps {
  metadata: MediaMetadata
}

function MediaTechnicalInfo({
  metadata
}: MediaTechnicalInfoProps) {

  function formatBitrate(value: number | null): string {
    if (value === null) return 'Unbekannt'

    return `${(value / 1_000_000).toFixed(2)} Mbit/s`
  }

  function formatDuration(seconds: number): string {

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    return [
      hours,
      minutes,
      remainingSeconds
    ]
      .map(value => String(value).padStart(2, '0'))
      .join(':')
  }

  function formatCodec(codec: string | null): string {
    if (!codec) return 'Unbekannt'

    const codecs: Record<string, string> = {
      hevc: 'HEVC (H.265)',
      h264: 'AVC (H.264)',
      av1: 'AV1',
      vp9: 'VP9',
      aac: 'AAC',
      ac3: 'Dolby Digital',
      eac3: 'Dolby Digital Plus',
      dts: 'DTS',
      truehd: 'Dolby TrueHD',
      flac: 'FLAC',
      opus: 'Opus',
      hdmv_pgs_subtitle: 'PGS',
      subrip: 'SRT',
      ass: 'ASS',
      ssa: 'SSA'
    }

    return codecs[codec] ?? codec.toUpperCase()
  }

  function formatLanguage(language: string | null): string {

    if (!language) return 'Unbekannt'

    const languages: Record<string, string> = {
      deu: 'Deutsch',
      ger: 'Deutsch',
      eng: 'Englisch',
      fra: 'Französisch',
      fre: 'Französisch',
      spa: 'Spanisch',
      ita: 'Italienisch',
      jpn: 'Japanisch'
    }

    return languages[language.toLowerCase()] ?? language
  }

  function formatChannels(
    channels: number | null,
    layout: string | null
  ): string {

    if (layout) return layout

    if (channels === null) return 'Unbekannt'

    return `${channels} Kanal${channels !== 1 ? 'e' : ''}`
  }

  function formatFrameRate(value: string | null): string {

    if (!value) return 'Unbekannt'

    const [numerator, denominator] = value.split('/').map(Number)

    if (
      denominator &&
      Number.isFinite(numerator) &&
      Number.isFinite(denominator)
    ) {
      return `${(numerator / denominator).toFixed(3)} FPS`
    }

    return value
  }

  return (
    <section className="technical-info">

      <h2>Technische Medieninformationen</h2>

      <div className="technical-general">

        <h3>Allgemein</h3>

        <div className="technical-grid">

          <Info label="Dateiformat" value={metadata.formatName ?? 'Unbekannt'} />

          <Info label="Dateigröße" value={formatSize(metadata.size)} />

          <Info label="Laufzeit" value={formatDuration(metadata.duration)} />

          <Info label="Gesamtbitrate" value={formatBitrate(metadata.bitrate)} />

        </div>

      </div>

      <div className="technical-section">

        <h3>Video</h3>

        {metadata.videoStreams.map(video => (

          <div className="technical-track" key={video.index}>

            <div className="technical-grid">

              <Info label="Codec" value={formatCodec(video.codec)} />

              <Info
                label="Auflösung"
                value={
                  video.width && video.height
                    ? `${video.width} × ${video.height}`
                    : 'Unbekannt'
                }
              />

              <Info label="Profil" value={video.profile ?? 'Unbekannt'} />

              <Info label="Bildrate" value={formatFrameRate(video.frameRate)} />

              <Info label="Pixel-Format" value={video.pixelFormat ?? 'Unbekannt'} />

              <Info label="Bitrate" value={formatBitrate(video.bitrate)} />

            </div>

          </div>

        ))}

      </div>

      <div className="technical-section">

        <h3>Audiospuren ({metadata.audioTracks.length})</h3>

        {metadata.audioTracks.map((audio, index) => (

          <div className="technical-track" key={audio.index}>

            <h4>
              {audio.title || `Audiospur ${index + 1}`}

              {audio.defaultTrack && (
                <span className="technical-badge">
                  Standard
                </span>
              )}

              {audio.commentary && (
                <span className="technical-badge">
                  Kommentar
                </span>
              )}

              {audio.original && (
                <span className="technical-badge">
                  Originalton
                </span>
              )}

              {audio.hearingImpaired && (
                <span className="technical-badge">
                  Hörgeschädigte
                </span>
              )}
            </h4>

            <div className="technical-grid">

              <Info label="Sprache" value={formatLanguage(audio.language)} />

              <Info label="Codec" value={formatCodec(audio.codec)} />

              <Info label="Profil" value={audio.profile ?? 'Unbekannt'} />

              <Info
                label="Kanäle"
                value={formatChannels(audio.channels, audio.channelLayout)}
              />

              <Info
                label="Abtastrate"
                value={audio.sampleRate
                  ? `${audio.sampleRate / 1000} kHz`
                  : 'Unbekannt'}
              />

              <Info label="Bitrate" value={formatBitrate(audio.bitrate)} />

            </div>

          </div>

        ))}

        {metadata.audioTracks.length === 0 && (
          <p>Keine Audiospuren gefunden.</p>
        )}

      </div>

      <div className="technical-section">

        <h3>Untertitel ({metadata.subtitleTracks.length})</h3>

        {metadata.subtitleTracks.map((subtitle, index) => (

          <div className="technical-track" key={subtitle.index}>

            <h4>
              {subtitle.title || `Untertitel ${index + 1}`}

              {subtitle.defaultTrack && (
                <span className="technical-badge">Standard</span>
              )}

              {subtitle.forced && (
                <span className="technical-badge">Erzwungen</span>
              )}
            </h4>

            <div className="technical-grid">

              <Info
                label="Sprache"
                value={formatLanguage(subtitle.language)}
              />

              <Info
                label="Format"
                value={formatCodec(subtitle.codec)}
              />

              <Info
                label="Typ"
                value={subtitle.textBased ? 'Text' : 'Bild'}
              />

            </div>

          </div>

        ))}

        {metadata.subtitleTracks.length === 0 && (
          <p>Keine Untertitel gefunden.</p>
        )}

      </div>

    </section>
  )
}

interface InfoProps {
  label: string
  value: string
}

function Info({ label, value }: InfoProps) {

  return (
    <div className="technical-info-item">

      <span>{label}</span>
      <strong>{value}</strong>

    </div>
  )
}

function formatSize(bytes: number): string {

  if (bytes === 0) return '0 Bytes'

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`
}

export default MediaTechnicalInfo
