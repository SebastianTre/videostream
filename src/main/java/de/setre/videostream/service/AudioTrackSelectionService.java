
package de.setre.videostream.service;

import de.setre.videostream.dto.MediaMetadataDto;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class AudioTrackSelectionService {

    /**
     * Ermittelt die passende Audiospur anhand der
     * bevorzugten Browsersprachen.
     */
    public MediaMetadataDto.AudioTrack selectAudioTrack(
            List<MediaMetadataDto.AudioTrack> audioTracks,
            List<Locale.LanguageRange> preferredLanguages) {

        if (audioTracks == null || audioTracks.isEmpty()) {
            return null;
        }

        // Kommentarspuren möglichst vermeiden.
        List<MediaMetadataDto.AudioTrack> normalTracks =
                audioTracks.stream()
                        .filter(track -> !track.commentary())
                        .toList();

        // Falls ausschließlich Kommentarspuren existieren,
        // bleiben diese als Rückfall verfügbar.
        List<MediaMetadataDto.AudioTrack> candidates =
                normalTracks.isEmpty()
                        ? audioTracks
                        : normalTracks;

        // 1. Passende Sprache anhand der Browserpräferenzen suchen.
        if (preferredLanguages != null && !preferredLanguages.isEmpty()) {

            for (Locale.LanguageRange preferredLanguage : preferredLanguages) {

                String language = preferredLanguage.getRange();

                MediaMetadataDto.AudioTrack matchingTrack =
                        candidates.stream()
                                .filter(track -> matchesLanguage(
                                        track.language(),
                                        language
                                ))
                                .findFirst()
                                .orElse(null);

                if (matchingTrack != null) {
                    return matchingTrack;
                }
            }
        }

        // 2. Standardspur bevorzugen.
        return candidates.stream()
                .filter(MediaMetadataDto.AudioTrack::defaultTrack)
                .findFirst()
                .orElse(candidates.getFirst());
    }

    /**
     * Vergleicht eine Audiosprache mit einer bevorzugten Sprache.
     *
     * Beispiele:
     * deu == de
     * ger == de
     * eng == en
     * de-DE == de
     */
    private boolean matchesLanguage(
            String trackLanguage,
            String preferredLanguage) {

        if (trackLanguage == null || preferredLanguage == null) {
            return false;
        }

        String track = normalizeLanguage(trackLanguage);
        String preferred = normalizeLanguage(preferredLanguage);

        // Nur den eigentlichen Sprachcode vergleichen.
        track = track.split("-")[0];
        preferred = preferred.split("-")[0];

        return track.equals(preferred);
    }

    /**
     * Vereinheitlicht Sprachcodes.
     */
    private String normalizeLanguage(String language) {

        String normalized = language
                .trim()
                .toLowerCase(Locale.ROOT);

        return switch (normalized) {

            case "deu", "ger" -> "de";
            case "eng" -> "en";
            case "fra", "fre" -> "fr";
            case "spa" -> "es";
            case "ita" -> "it";
            case "jpn" -> "ja";
            case "por" -> "pt";
            case "nld", "dut" -> "nl";
            case "pol" -> "pl";
            case "rus" -> "ru";

            default -> normalized;
        };
    }
}
