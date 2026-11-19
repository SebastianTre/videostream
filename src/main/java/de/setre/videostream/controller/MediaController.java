package de.setre.videostream.controller;

import de.setre.videostream.dto.MediaItemDto;
import de.setre.videostream.service.AudioTrackSelectionService;
import de.setre.videostream.service.MediaMetadataService;
import de.setre.videostream.dto.MediaMetadataDto;
import de.setre.videostream.service.MediaService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import de.setre.videostream.dto.HlsStartRequest;
import de.setre.videostream.dto.HlsAudioRequest;
import de.setre.videostream.dto.HlsSessionDto;
import de.setre.videostream.service.HlsStreamingService;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

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
    private final HlsStreamingService hlsStreamingService;

    public MediaController(
            MediaService mediaService,
            MediaMetadataService mediaMetadataService,
            HlsStreamingService hlsStreamingService) {

        this.mediaService = mediaService;
        this.mediaMetadataService = mediaMetadataService;
        this.hlsStreamingService = hlsStreamingService;
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
            @RequestParam String path,
            @RequestParam(required = false) List<String> languages) {

        try {

            return mediaMetadataService.getMetadata(
                    path,
                    languages
            );

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



    /**
     * Startet eine neue HLS-Wiedergabesitzung.
     */
    @PostMapping("/hls/start")
    public HlsSessionDto startHls(
            @RequestBody HlsStartRequest request) {

        try {

            if (request.path() == null || request.path().isBlank()) {
                throw new IllegalArgumentException(
                        "Videopfad fehlt"
                );
            }

            return hlsStreamingService.start(
                    request.path(),
                    request.audioTrackIndex(),
                    request.audioMode()
            );

        } catch (IllegalArgumentException e) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    e.getMessage()
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "HLS-Start wurde unterbrochen"
            );

        } catch (IOException e) {

            e.printStackTrace();

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "HLS-Stream konnte nicht gestartet werden"
                            + e.getMessage(),
                    e
            );
        }
    }

    /**
     * Wechselt die Audiospur durch Neustart von FFmpeg.
     */
    @PostMapping("/hls/{sessionId}/audio")
    public HlsSessionDto switchAudio(
            @PathVariable String sessionId,
            @RequestBody HlsAudioRequest request) {

        try {

            if (request.audioTrackIndex() == null) {
                throw new IllegalArgumentException(
                        "Audiospur fehlt"
                );
            }

            double position = request.positionSeconds() != null
                    ? request.positionSeconds()
                    : 0;

            return hlsStreamingService.switchAudio(
                    sessionId,
                    request.audioTrackIndex(),
                    position
            );

        } catch (IllegalArgumentException e) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    e.getMessage()
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Audiospurwechsel wurde unterbrochen"
            );

        } catch (IOException e) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Audiospur konnte nicht gewechselt werden"
            );
        }
    }

    /**
     * Liefert eine HLS-Playlist oder ein Segment.
     */
    @GetMapping("/hls/{sessionId}/{filename:.+}")
    public ResponseEntity<Resource> getHlsFile(
            @PathVariable String sessionId,
            @PathVariable String filename) {

        try {

            Path file = hlsStreamingService.getHlsFile(
                    sessionId,
                    filename
            );

            MediaType mediaType = filename.endsWith(".m3u8")
                    ? MediaType.parseMediaType(
                    "application/vnd.apple.mpegurl"
            )
                    : MediaType.parseMediaType(
                    "video/mp2t"
            );

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(new FileSystemResource(file));

        } catch (IllegalArgumentException e) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    e.getMessage()
            );
        }
    }

    /**
     * Beendet eine HLS-Wiedergabesitzung.
     */
    @DeleteMapping("/hls/{sessionId}")
    public ResponseEntity<Void> stopHls(
            @PathVariable String sessionId) {

        hlsStreamingService.stop(sessionId);

        return ResponseEntity.noContent().build();
    }

}
