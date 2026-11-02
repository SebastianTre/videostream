
package de.setre.videostream.service;

import de.setre.videostream.config.MediaProperties;
import de.setre.videostream.dto.MediaItemDto;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

@Service
public class MediaService {

    private final MediaProperties mediaProperties;

    private static final Set<String> VIDEO_EXTENSIONS = Set.of(
            "mkv",
            "mp4",
            "avi",
            "mov",
            "wmv",
            "m4v",
            "mpg",
            "mpeg",
            "ts",
            "webm"
    );

    public MediaService(MediaProperties mediaProperties) {
        this.mediaProperties = mediaProperties;
    }

    public List<MediaItemDto> getMediaItems(String relativePath)
            throws IOException {

        Path rootPath = mediaProperties.getRootPath()
                .toAbsolutePath()
                .normalize();

        Path currentPath = rootPath.resolve(
                relativePath == null ? "" : relativePath
        ).normalize();

        // Sicherheitsprüfung: Zugriff nur innerhalb des Medienordners
        if (!currentPath.startsWith(rootPath)) {
            throw new IllegalArgumentException(
                    "Ungültiger Medienpfad"
            );
        }

        if (!Files.isDirectory(currentPath)) {
            throw new IllegalArgumentException(
                    "Verzeichnis existiert nicht"
            );
        }

        try (Stream<Path> paths = Files.list(currentPath)) {

            return paths
                    .filter(path -> Files.isDirectory(path)
                            || isVideoFile(path))
                    .map(path -> {

                        boolean isDirectory =
                                Files.isDirectory(path);

                        long size = 0;

                        if (!isDirectory) {
                            try {
                                size = Files.size(path);
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        }

                        String itemPath = rootPath
                                .relativize(path)
                                .toString()
                                .replace("\\", "/");

                        return new MediaItemDto(
                                path.getFileName().toString(),
                                itemPath,
                                isDirectory,
                                size
                        );
                    })
                    .sorted((a, b) -> {

                        // Ordner zuerst
                        if (a.directory() != b.directory()) {
                            return a.directory() ? -1 : 1;
                        }

                        return a.name().compareToIgnoreCase(b.name());
                    })
                    .toList();
        }
    }

    private boolean isVideoFile(Path path) {

        String filename = path.getFileName()
                .toString();

        int dotIndex = filename.lastIndexOf('.');

        if (dotIndex < 0) {
            return false;
        }

        String extension = filename
                .substring(dotIndex + 1)
                .toLowerCase();

        return VIDEO_EXTENSIONS.contains(extension);
    }
}
