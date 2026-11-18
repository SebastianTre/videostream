package de.setre.videostream.dto;

public record HlsStartRequest(
        String path,
        Integer audioTrackIndex
) {
}