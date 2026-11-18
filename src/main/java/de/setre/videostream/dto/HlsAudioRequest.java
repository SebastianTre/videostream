package de.setre.videostream.dto;

public record HlsAudioRequest(
        Integer audioTrackIndex,
        Double positionSeconds
) {
}