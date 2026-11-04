
package de.setre.videostream.dto;

import java.util.List;

public record MediaMetadataDto(
        String filename,
        long size,
        double duration,
        VideoStream video,
        List<AudioTrack> audioTracks
) {

    public record VideoStream(
            String codec,
            Integer width,
            Integer height,
            String frameRate
    ) {
    }

    public record AudioTrack(
            int index,
            String codec,
            String language,
            String title,
            Integer channels,
            String channelLayout,
            Long bitrate
    ) {
    }
}
