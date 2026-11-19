
package de.setre.videostream.service;

import de.setre.videostream.config.MediaProperties;
import de.setre.videostream.dto.AudioMode;
import de.setre.videostream.dto.HlsSessionDto;
import de.setre.videostream.dto.MediaMetadataDto;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.LinkOption;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
public class HlsStreamingService {

    private static final long SESSION_TIMEOUT_MINUTES = 30;

    private static final Pattern ALLOWED_FILES =
            Pattern.compile("master\\.m3u8|segment_[0-9]+\\.ts");

    private final MediaProperties mediaProperties;
    private final MediaService mediaService;
    private final MediaMetadataService metadataService;

    private final Map<String, HlsSession> sessions =
            new ConcurrentHashMap<>();

    public HlsStreamingService(
            MediaProperties mediaProperties,
            MediaService mediaService,
            MediaMetadataService metadataService) {

        this.mediaProperties = mediaProperties;
        this.mediaService = mediaService;
        this.metadataService = metadataService;
    }

    private static class HlsSession {

        final String id;
        final String relativePath;
        final Path directory;
        final AudioMode audioMode;

        volatile Integer audioTrackIndex;
        volatile Process process;
        volatile Instant lastAccess;

        HlsSession(
                String id,
                String relativePath,
                Path directory,
                AudioMode audioMode,
                Integer audioTrackIndex) {

            this.id = id;
            this.relativePath = relativePath;
            this.directory = directory;
            this.audioMode = audioMode;
            this.audioTrackIndex = audioTrackIndex;
            this.lastAccess = Instant.now();
        }
    }

    /**
     * Startet eine neue HLS-Wiedergabesitzung.
     */
    public HlsSessionDto start(
            String relativePath,
            Integer audioTrackIndex,
            AudioMode audioMode)
            throws IOException, InterruptedException {

        if (audioMode == null) {
            throw new IllegalArgumentException(
                    "Audiomodus fehlt"
            );
        }

        Path videoPath =
                mediaService.getVideoPath(relativePath);

        Integer selectedTrack = null;

        if (audioMode == AudioMode.AAC) {

            MediaMetadataDto metadata =
                    metadataService.getMetadata(relativePath, null);

            selectedTrack = audioTrackIndex != null
                    ? audioTrackIndex
                    : metadata.selectedAudioTrackIndex();

            validateAudioTrack(metadata, selectedTrack);
        }

        String sessionId = UUID.randomUUID().toString();

        Path directory = Files.createTempDirectory(
                "videostream-hls-"
        );

        HlsSession session = new HlsSession(
                sessionId,
                relativePath,
                directory,
                audioMode,
                selectedTrack
        );

        try {

            sessions.put(sessionId, session);

            startFfmpeg(
                    session,
                    videoPath,
                    selectedTrack,
                    audioMode,
                    0
            );

            waitForPlaylist(session, 300);

            return new HlsSessionDto(
                    sessionId,
                    "/api/media/hls/" + sessionId + "/master.m3u8"
            );

        } catch (Exception e) {

            sessions.remove(sessionId);
            stopProcess(session.process);
            deleteDirectory(directory);

            throw e;
        }
    }

    /**
     * Startet den Stream mit einer anderen Audiospur neu.
     */
    public HlsSessionDto switchAudio(
            String sessionId,
            Integer audioTrackIndex,
            double positionSeconds)
            throws IOException, InterruptedException {

        HlsSession session = getSession(sessionId);

        if (session.audioMode != AudioMode.AAC) {
            throw new IllegalArgumentException(
                    "Audiospurwechsel ist nur im AAC-Modus möglich"
            );
        }

        if (!Double.isFinite(positionSeconds)
                || positionSeconds < 0) {

            throw new IllegalArgumentException(
                    "Ungültige Wiedergabeposition"
            );
        }

        Path videoPath =
                mediaService.getVideoPath(session.relativePath);

        MediaMetadataDto metadata =
                metadataService.getMetadata(
                        session.relativePath,
                        null
                );

        validateAudioTrack(metadata, audioTrackIndex);

        stopProcess(session.process);

        session.process = null;

        clearDirectory(session.directory);

        session.audioTrackIndex = audioTrackIndex;

        startFfmpeg(
                session,
                videoPath,
                audioTrackIndex,
                AudioMode.AAC,
                positionSeconds
        );

        waitForPlaylist(session, 300);

        session.lastAccess = Instant.now();

        return new HlsSessionDto(
                sessionId,
                "/api/media/hls/" + sessionId + "/master.m3u8"
        );
    }



    /**
     * Startet FFmpeg und erzeugt eine HLS-Playlist.
     */
    private void startFfmpeg(
            HlsSession session,
            Path videoPath,
            Integer audioTrackIndex,
            AudioMode audioMode,
            double positionSeconds)
            throws IOException {

        Path playlist = session.directory.resolve(
                "master.m3u8"
        );

        Path segmentPattern = session.directory.resolve(
                "segment_%06d.ts"
        );

        Path logFile = session.directory.resolve(
                "ffmpeg.log"
        );

        var command = new java.util.ArrayList<String>();

        command.add(mediaProperties.getFfmpegPath());

        command.add("-hide_banner");
        command.add("-loglevel");
        command.add("info");

        if (positionSeconds > 0) {
            command.add("-ss");
            command.add(String.format(
                    java.util.Locale.ROOT,
                    "%.3f",
                    positionSeconds
            ));
        }

        command.add("-i");
        command.add(videoPath.toString());

        // Videostream unverändert übernehmen.
        command.add("-map");
        command.add("0:v:0");

        command.add("-c:v");
        command.add("copy");

        // Audiomodus festlegen.
        if (audioMode == AudioMode.AAC) {

            if (audioTrackIndex == null) {
                throw new IllegalArgumentException(
                        "Keine Audiospur ausgewählt"
                );
            }

            command.add("-map");
            command.add("0:" + audioTrackIndex);

            command.add("-c:a");
            command.add("aac");

            command.add("-b:a");
            command.add("192k");

            command.add("-ac");
            command.add("2");

        } else if (audioMode == AudioMode.NONE) {

            command.add("-an");

        } else {

            throw new IllegalArgumentException(
                    "Nicht unterstützter Audiomodus"
            );
        }

        command.add("-sn");
        command.add("-dn");

        command.add("-f");
        command.add("hls");

        command.add("-hls_time");
        command.add("4");

        command.add("-hls_list_size");
        command.add("0");

        command.add("-hls_playlist_type");
        command.add("vod");

        command.add("-hls_segment_filename");
        command.add(segmentPattern.toString());

        command.add("-hls_flags");
        command.add("independent_segments+temp_file");

        command.add(playlist.toString());

        ProcessBuilder builder = new ProcessBuilder(command);

        builder.redirectOutput(ProcessBuilder.Redirect.DISCARD);
        builder.redirectError(logFile.toFile());

        session.process = builder.start();
    }






    private void waitForPlaylist(
            HlsSession session,
            long timeoutSeconds)
            throws IOException, InterruptedException {

        Path playlist = session.directory.resolve("master.m3u8");

        long deadline = System.nanoTime()
                + TimeUnit.SECONDS.toNanos(timeoutSeconds);

        while (System.nanoTime() < deadline) {

            Process process = session.process;

            if (process == null) {
                throw new IOException("FFmpeg-Prozess ist null");
            }

            // Zuerst prüfen, ob eine gültige Playlist existiert.
            if (Files.isRegularFile(playlist)
                    && Files.size(playlist) > 0) {

                String content = Files.readString(playlist);

                if (content.contains("#EXTM3U")
                        && content.contains("#EXTINF:")) {

                    // Playlist ist vorhanden.
                    // Auch ein bereits beendeter FFmpeg-Prozess
                    // kann erfolgreich gewesen sein.
                    if (!process.isAlive() && process.exitValue() != 0) {
                        throw new IOException(
                                "FFmpeg wurde mit Fehler beendet.\n"
                                        + "Exit-Code: " + process.exitValue()
                                        + "\nLog:\n" + readFfmpegLog(session)
                        );
                    }

                    return;
                }
            }

            // Prozessende ohne gültige Playlist prüfen.
            if (!process.isAlive()) {

                int exitCode = process.exitValue();

                throw new IOException(
                        "FFmpeg wurde beendet, ohne eine gültige HLS-Playlist "
                                + "zu erzeugen.\n"
                                + "Exit-Code: " + exitCode
                                + "\nPlaylist vorhanden: "
                                + Files.exists(playlist)
                                + "\nLog:\n" + readFfmpegLog(session)
                );
            }

            Thread.sleep(200);
        }

        throw new IOException(
                "Zeitüberschreitung beim Erzeugen der HLS-Playlist.\n"
                        + readFfmpegLog(session)
        );
    }



    private String readFfmpegLog(HlsSession session) {

        Path logFile = session.directory.resolve("ffmpeg.log");

        try {
            if (Files.exists(logFile)) {
                return Files.readString(logFile);
            }
        } catch (IOException e) {
            return "FFmpeg-Log konnte nicht gelesen werden";
        }

        return "Kein FFmpeg-Log vorhanden";
    }
    /**
     * Prüft, ob die angeforderte Audiospur existiert.
     */
    private void validateAudioTrack(
            MediaMetadataDto metadata,
            Integer audioTrackIndex) {

        if (audioTrackIndex == null) {
            throw new IllegalArgumentException(
                    "Keine passende Audiospur gefunden"
            );
        }

        boolean exists = metadata.audioTracks()
                .stream()
                .anyMatch(track ->
                        track.index() == audioTrackIndex
                );

        if (!exists) {
            throw new IllegalArgumentException(
                    "Die ausgewählte Audiospur existiert nicht"
            );
        }
    }

    /**
     * Liefert eine Datei aus einer HLS-Sitzung.
     */
    public Path getHlsFile(
            String sessionId,
            String filename) {

        if (filename == null
                || !ALLOWED_FILES.matcher(filename).matches()) {
            throw new IllegalArgumentException(
                    "Ungültiger HLS-Dateiname"
            );
        }

        HlsSession session = getSession(sessionId);

        Path file = session.directory.resolve(filename).normalize();

        if (!file.startsWith(session.directory)
                || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException(
                    "HLS-Datei wurde nicht gefunden"
            );
        }

        session.lastAccess = Instant.now();

        return file;
    }

    private HlsSession getSession(String sessionId) {

        HlsSession session = sessions.get(sessionId);

        if (session == null) {
            throw new IllegalArgumentException(
                    "Wiedergabesitzung existiert nicht"
            );
        }

        session.lastAccess = Instant.now();

        return session;
    }

    /**
     * Beendet eine Wiedergabesitzung.
     */
    public void stop(String sessionId) {

        HlsSession session = sessions.remove(sessionId);

        if (session == null) {
            return;
        }

        stopProcess(session.process);

        deleteDirectory(session.directory);
    }

    private void stopProcess(Process process) {

        if (process == null || !process.isAlive()) {
            return;
        }

        process.destroy();

        try {

            if (!process.waitFor(3, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                process.waitFor(3, TimeUnit.SECONDS);
            }

        } catch (InterruptedException e) {

            process.destroyForcibly();
            Thread.currentThread().interrupt();
        }
    }

    private void clearDirectory(Path directory)
            throws IOException {

        try (var files = Files.list(directory)) {

            for (Path file : files.toList()) {
                Files.deleteIfExists(file);
            }
        }
    }

    private void deleteDirectory(Path directory) {

        if (!Files.exists(directory)) {
            return;
        }

        try (var paths = Files.walk(directory)) {

            paths.sorted(Comparator.reverseOrder())
                    .forEach(path -> {

                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            System.err.println(
                                    "Temporäre Datei konnte nicht gelöscht werden: "
                                            + path
                            );
                        }
                    });

        } catch (IOException e) {

            System.err.println(
                    "Temporäres HLS-Verzeichnis konnte nicht gelöscht werden: "
                            + directory
            );
        }
    }

    /**
     * Entfernt inaktive Sitzungen automatisch.
     */
    @Scheduled(fixedDelay = 60000)
    public void cleanupInactiveSessions() {

        Instant expiration = Instant.now().minusSeconds(
                SESSION_TIMEOUT_MINUTES * 60
        );

        sessions.forEach((id, session) -> {

            if (session.lastAccess.isBefore(expiration)) {
                stop(id);
            }
        });
    }



}
