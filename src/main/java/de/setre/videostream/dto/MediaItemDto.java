package de.setre.videostream.dto;

public record MediaItemDto(
        String name,
        String relativePath,
        boolean directory,
        long size
) {
}