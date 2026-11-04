
package de.setre.videostream.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;

@ConfigurationProperties(prefix = "app.media")
public class MediaProperties {

    private Path rootPath;

    private String ffprobePath;

    public Path getRootPath() {
        return rootPath;
    }

    public void setRootPath(Path rootPath) {
        this.rootPath = rootPath;
    }

    public String getFfprobePath() {
        return ffprobePath;
    }

    public void setFfprobePath(String ffprobePath) {
        this.ffprobePath = ffprobePath;
    }
}
