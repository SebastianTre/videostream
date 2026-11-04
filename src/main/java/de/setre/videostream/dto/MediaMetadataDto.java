
package de.setre.videostream.dto;

import java.util.List;

public record MediaMetadataDto(
        String filename,
        long size,
        double duration,

        String formatName,
        String formatLongName,
        Long bitrate,

        List<VideoStream> videoStreams,
        List<AudioTrack> audioTracks,
        List<SubtitleTrack> subtitleTracks
) {

    public record VideoStream(
            int index,
            String codec,
            String codecLongName,
            String profile,
            Integer width,
            Integer height,
            String frameRate,
            String pixelFormat,
            String aspectRatio,
            Long bitrate
    ) {
    }

    public record AudioTrack(
            int index,
            String codec,
            String codecLongName,
            String profile,
            String language,
            String title,
            Integer channels,
            String channelLayout,
            Integer sampleRate,
            Long bitrate,
            boolean defaultTrack,
            boolean forced,
            boolean commentary,
            boolean original,
            boolean hearingImpaired
    ) {
    }

    public record SubtitleTrack(
            int index,
            String codec,
            String codecLongName,
            String language,
            String title,
            boolean defaultTrack,
            boolean forced,
            boolean textBased
    ) {
    }
}
