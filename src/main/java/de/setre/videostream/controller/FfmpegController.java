
package de.setre.videostream.controller;

import de.setre.videostream.config.MediaProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/ffmpeg")
public class FfmpegController {

    private final MediaProperties mediaProperties;

    public FfmpegController(MediaProperties mediaProperties) {
        this.mediaProperties = mediaProperties;
    }

    @GetMapping("/check")
    public Map<String, String> check() throws IOException, InterruptedException {

        String ffmpegVersion = getVersion(
                mediaProperties.getFfmpegPath()
        );

        String ffprobeVersion = getVersion(
                mediaProperties.getFfprobePath()
        );

        return Map.of(
                "ffmpeg", ffmpegVersion,
                "ffprobe", ffprobeVersion
        );
    }

    private String getVersion(String executable)
            throws IOException, InterruptedException {

        Process process = new ProcessBuilder(
                executable,
                "-version"
        )
                .redirectErrorStream(true)
                .start();

        try (var reader = process.inputReader()) {

            String firstLine = reader.readLine();

            boolean finished = process.waitFor(
                    10,
                    java.util.concurrent.TimeUnit.SECONDS
            );

            if (!finished) {
                process.destroyForcibly();
                throw new IOException(
                        "Programm hat das Zeitlimit überschritten."
                );
            }

            if (process.exitValue() != 0 || firstLine == null) {
                throw new IOException(
                        "Programm konnte nicht gestartet werden: " + executable
                );
            }

            return firstLine;
        }
    }
}
