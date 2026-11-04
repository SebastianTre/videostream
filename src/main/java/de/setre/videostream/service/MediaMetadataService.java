
package de.setre.videostream.service;

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
                    "format=duration,format_name,format_long_name,bit_rate:" +

                            "stream=index,codec_type,codec_name,codec_long_name," +
                            "profile,width,height,avg_frame_rate," +
                            "pix_fmt,sample_aspect_ratio,bit_rate," +
                            "channels,channel_layout,sample_rate:" +

                            "stream_tags=language,title:" +

                            "stream_disposition=default,forced,comment,original,hearing_impaired"
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

            JsonNode root = objectMapper.readTree(
                    outputFile.toFile()
            );

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

        String formatName = nullableText(format, "format_name");
        String formatLongName = nullableText(format, "format_long_name");

        Long formatBitrate = nullableLong(format, "bit_rate");

        JsonNode streams = root.path("streams");

        List<MediaMetadataDto.VideoStream> videoStreams =
                new ArrayList<>();

        List<MediaMetadataDto.AudioTrack> audioTracks =
                new ArrayList<>();

        List<MediaMetadataDto.SubtitleTrack> subtitleTracks =
                new ArrayList<>();

        for (JsonNode stream : streams) {

            String codecType = stream.path("codec_type").asText();

            int index = stream.path("index").asInt();

            String codec = nullableText(stream, "codec_name");
            String codecLongName = nullableText(stream, "codec_long_name");
            String profile = nullableText(stream, "profile");

            JsonNode tags = stream.path("tags");
            JsonNode disposition = stream.path("disposition");

            String language = nullableText(tags, "language");
            String title = nullableText(tags, "title");

            boolean defaultTrack =
                    disposition.path("default").asInt(0) == 1;

            boolean forced =
                    disposition.path("forced").asInt(0) == 1;

            Long bitrate = nullableLong(stream, "bit_rate");

            switch (codecType) {

                case "video" -> {

                    videoStreams.add(
                            new MediaMetadataDto.VideoStream(
                                    index,
                                    codec,
                                    codecLongName,
                                    profile,
                                    nullableInteger(stream, "width"),
                                    nullableInteger(stream, "height"),
                                    nullableText(stream, "avg_frame_rate"),
                                    nullableText(stream, "pix_fmt"),
                                    nullableText(stream, "sample_aspect_ratio"),
                                    bitrate
                            )
                    );
                }

                case "audio" -> {
                    boolean commentary =
                            disposition.path("comment").asInt(0) == 1
                                    || isCommentaryTrack(title);

                    boolean original =
                            disposition.path("original").asInt(0) == 1;

                    boolean hearingImpaired =
                            disposition.path("hearing_impaired").asInt(0) == 1;
                    audioTracks.add(
                            new MediaMetadataDto.AudioTrack(
                                    index,
                                    codec,
                                    codecLongName,
                                    profile,
                                    language,
                                    title,
                                    nullableInteger(stream, "channels"),
                                    nullableText(stream, "channel_layout"),
                                    nullableInteger(stream, "sample_rate"),
                                    bitrate,
                                    defaultTrack,
                                    forced,
                                    commentary,
                                    original,
                                    hearingImpaired
                            )
                    );
                }

                case "subtitle" -> {

                    subtitleTracks.add(
                            new MediaMetadataDto.SubtitleTrack(
                                    index,
                                    codec,
                                    codecLongName,
                                    language,
                                    title,
                                    defaultTrack,
                                    forced,
                                    isTextSubtitle(codec)
                            )
                    );
                }

                default -> {
                    // Andere Streamtypen werden vorerst ignoriert.
                }
            }
        }

        return new MediaMetadataDto(
                videoPath.getFileName().toString(),
                Files.size(videoPath),
                duration,
                formatName,
                formatLongName,
                formatBitrate,
                videoStreams,
                audioTracks,
                subtitleTracks
        );
    }

    private boolean isTextSubtitle(String codec) {

        if (codec == null) {
            return false;
        }

        return switch (codec.toLowerCase()) {

            case "subrip",
                 "srt",
                 "ass",
                 "ssa",
                 "webvtt",
                 "mov_text",
                 "text",
                 "ttml",
                 "hdmv_text_subtitle" -> true;

            default -> false;
        };
    }

    private String nullableText(
            JsonNode node,
            String field) {

        if (!node.hasNonNull(field)) {
            return null;
        }

        String value = node.path(field).asText();

        return value.isBlank() ? null : value;
    }

    private Integer nullableInteger(
            JsonNode node,
            String field) {

        if (!node.hasNonNull(field)) {
            return null;
        }

        return node.path(field).asInt();
    }

    private Long nullableLong(
            JsonNode node,
            String field) {

        if (!node.hasNonNull(field)) {
            return null;
        }

        return node.path(field).asLong();
    }

    private boolean isCommentaryTrack(String title) {

        if (title == null || title.isBlank()) {
            return false;
        }

        String normalized = title.toLowerCase(
                java.util.Locale.ROOT
        );

        return normalized.contains("commentary")
                || normalized.contains("comment")
                || normalized.contains("kommentar")
                || normalized.contains("director`s cut commentary")
                || normalized.contains("audiokommentar");
    }
}
