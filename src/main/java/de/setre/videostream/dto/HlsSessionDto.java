package de.setre.videostream.dto;

public record HlsSessionDto(
        String sessionId,
        String playlistUrl
) {
}