
package de.setre.videostream.service;

//import com.fasterxml.jackson.databind.JsonNode;
//import com.fasterxml.jackson.databind.ObjectMapper;
import de.setre.videostream.config.MediaProperties;
import de.setre.videostream.dto.MediaMetadataDto;
import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class MediaMetadataService {

    private final MediaProperties mediaProperties;
    private final MediaService mediaService;
    private final JsonMapper objectMapper;

    public MediaMetadataService(
            MediaProperties mediaProperties,
            MediaService mediaService,
            JsonMapper objectMapper) {

        this.mediaProperties = mediaProperties;
        this.mediaService = mediaService;
        this.objectMapper = objectMapper;
    }

    public MediaMetadataDto getMetadata(String relativePath)
            throws IOException, InterruptedException {

        // Videopfad validieren
        Path videoPath = mediaService.getVideoPath(relativePath);

        Path outputFile = Files.createTempFile(
                "videostream-ffprobe-",
                ".json"
        );

        try {

            List<String> command = new ArrayList<>();

            command.add(mediaProperties.getFfprobePath());
            command.add("-v");
            command.add("error");

            command.add("-show_entries");
            command.add(
                    "format=duration:" +
                            "stream=index,codec_type,codec_name," +
                            "width,height,avg_frame_rate,channels,channel_layout, bit_rate:" +
                            "stream_tags=language,title"
            );

            command.add("-of");
            command.add("json");

            command.add(videoPath.toString());

            ProcessBuilder processBuilder =
                    new ProcessBuilder(command);

            processBuilder.redirectOutput(outputFile.toFile());
            processBuilder.redirectError(ProcessBuilder.Redirect.DISCARD);

            Process process = processBuilder.start();

            boolean finished;

            try {
                finished = process.waitFor(
                        30,
                        TimeUnit.SECONDS
                );
            } catch (InterruptedException e) {
                process.destroyForcibly();
                Thread.currentThread().interrupt();
                throw e;
            }

            if (!finished) {
                process.destroyForcibly();
                process.waitFor();

                throw new IOException(
                        "FFprobe hat das Zeitlimit überschritten."
                );
            }

            if (process.exitValue() != 0) {
                throw new IOException(
                        "FFprobe konnte die Videodatei nicht analysieren."
                );
            }

            JsonNode root = objectMapper.readTree(outputFile.toFile());

            return mapMetadata(videoPath, root);

        } finally {

            Files.deleteIfExists(outputFile);
        }
    }

    private MediaMetadataDto mapMetadata(
            Path videoPath,
            JsonNode root) throws IOException {

        JsonNode format = root.path("format");

        double duration = format.path("duration").asDouble(0);

        JsonNode streams = root.path("streams");

        MediaMetadataDto.VideoStream video = null;

        List<MediaMetadataDto.AudioTrack> audioTracks =
                new ArrayList<>();

        for (JsonNode stream : streams) {

            String codecType = stream.path("codec_type").asText();

            int index = stream.path("index").asInt();

            String codec = stream.path("codec_name").asText(null);

            JsonNode tags = stream.path("tags");

            String language = tags.path("language").asText(null);
            String title = tags.path("title").asText(null);

            if ("video".equals(codecType) && video == null) {

                video = new MediaMetadataDto.VideoStream(
                        codec,
                        nullableInteger(stream, "width"),
                        nullableInteger(stream, "height"),
                        stream.path("avg_frame_rate").asText(null)
                );
            }

            if ("audio".equals(codecType)) {

                String channels = stream.path("channel_layout")
                        .asText(null);

                if (channels == null || channels.isBlank()) {
                    channels = stream.has("channels")
                            ? stream.path("channels").asText()
                            : null;
                }

                audioTracks.add(
                        new MediaMetadataDto.AudioTrack(
                                index,
                                codec,
                                language,
                                title,
                                nullableInteger(stream, "channels"),
                                stream.path("channel_layout").asText(null),
                                stream.hasNonNull("bit_rate")
                                        ? stream.path("bit_rate").asLong()
                                        : null
                        )
                );
            }
        }

        return new MediaMetadataDto(
                videoPath.getFileName().toString(),
                Files.size(videoPath),
                duration,
                video,
                audioTracks
        );
    }

    private Integer nullableInteger(
            JsonNode node,
            String field) {

        return node.hasNonNull(field)
                ? node.path(field).asInt()
                : null;
    }
}
