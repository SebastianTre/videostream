package de.setre.videostream.controller;

import de.setre.videostream.dto.MediaItemDto;
import de.setre.videostream.service.MediaMetadataService;
import de.setre.videostream.dto.MediaMetadataDto;
import de.setre.videostream.service.MediaService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.file.Path;
import java.nio.file.Files;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MediaService mediaService;
    private final MediaMetadataService mediaMetadataService;

    public MediaController(
            MediaService mediaService,
            MediaMetadataService mediaMetadataService) {

        this.mediaService = mediaService;
        this.mediaMetadataService = mediaMetadataService;
    }

    @GetMapping
    public List<MediaItemDto> getMediaItems(
            @RequestParam(required = false, defaultValue = "")
            String path) {

        try {
            return mediaService.getMediaItems(path);

        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    e.getMessage()
            );

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Fehler beim Lesen des Medienverzeichnisses"
            );
        }
    }

    @GetMapping("/stream")
    public ResponseEntity<Resource> streamVideo(
            @RequestParam String path) {

        try {
            Path videoPath = mediaService.getVideoPath(path);

            Resource resource = new FileSystemResource(videoPath);

            String contentType = Files.probeContentType(videoPath);

            MediaType mediaType = contentType != null
                    ? MediaType.parseMediaType(contentType)
                    : MediaType.APPLICATION_OCTET_STREAM;

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(resource);

        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    e.getMessage()
            );

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Videodatei konnte nicht gelesen werden"
            );
        }
    }

    @GetMapping("/metadata")
    public MediaMetadataDto getMetadata(
            @RequestParam String path) {

        try {
            return mediaMetadataService.getMetadata(path);

        } catch (IllegalArgumentException e) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    e.getMessage()
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Metadatenanalyse wurde unterbrochen"
            );

        } catch (IOException e) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Videometadaten konnten nicht ermittelt werden"
            );
        }
    }
}
