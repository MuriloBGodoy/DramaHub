package com.dramahub.dto;

import com.dramahub.model.Episode;
import com.dramahub.model.Series;
import com.dramahub.model.WatchProgress;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.Arrays;
import java.util.List;

/** DTOs da API. Records simples, mapeados manualmente a partir das entidades. */
public final class Dtos {

    private Dtos() {}

    public record SeriesSummary(Long id, String title, String synopsis, String coverUrl, String genre,
                                List<String> tags, String source, String credit, boolean featured,
                                int episodeCount) {
        public static SeriesSummary of(Series s, int episodeCount) {
            return new SeriesSummary(s.getId(), s.getTitle(), s.getSynopsis(), s.getCoverUrl(), s.getGenre(),
                    splitTags(s.getTags()), s.getSource(), s.getCredit(), s.isFeatured(), episodeCount);
        }
    }

    public record SeriesDetail(Long id, String title, String synopsis, String coverUrl, String genre,
                               List<String> tags, String source, String credit, boolean featured, String script,
                               List<EpisodeDto> episodes) {
        public static SeriesDetail of(Series s) {
            return new SeriesDetail(s.getId(), s.getTitle(), s.getSynopsis(), s.getCoverUrl(), s.getGenre(),
                    splitTags(s.getTags()), s.getSource(), s.getCredit(), s.isFeatured(), s.getScript(),
                    s.getEpisodes().stream().map(e -> EpisodeDto.of(e, s)).toList());
        }
    }

    public record EpisodeDto(Long id, Long seriesId, String seriesTitle, String seriesCoverUrl, int number,
                             String title, String streamUrl, String youtubeId, String thumbnailUrl, Double startSec,
                             Double endSec, Integer durationSec) {
        public static EpisodeDto of(Episode e, Series s) {
            // Video externo e servido direto pela URL; upload local passa por /api/stream/{id}
            String stream = e.getVideoFile() != null ? "/api/stream/" + e.getId() : e.getVideoUrl();
            return new EpisodeDto(e.getId(), s.getId(), s.getTitle(), s.getCoverUrl(), e.getNumber(), e.getTitle(),
                    stream, e.getYoutubeId(), e.getThumbnailUrl(), e.getStartSec(), e.getEndSec(), e.getDurationSec());
        }
    }

    public record ProgressDto(Long episodeId, Long seriesId, int episodeNumber, double positionSec,
                              boolean completed, EpisodeDto episode) {
        public static ProgressDto of(WatchProgress p) {
            Episode e = p.getEpisode();
            return new ProgressDto(e.getId(), e.getSeries().getId(), e.getNumber(), p.getPositionSec(),
                    p.isCompleted(), EpisodeDto.of(e, e.getSeries()));
        }
    }

    public record ContinueWatchingDto(SeriesSummary series, ProgressDto progress) {}

    public record SaveProgressRequest(Double positionSec, Boolean completed) {}

    public record CreateSeriesRequest(@NotBlank String title, String synopsis, String coverUrl, String genre,
                                      String tags, String source, String credit, Boolean featured, String script) {}

    /** Edicao parcial: campos nulos sao mantidos. */
    public record UpdateSeriesRequest(String title, String synopsis, String coverUrl, String genre, String tags,
                                      String credit, Boolean featured, String script) {}

    public record CreateEpisodeRequest(@Min(1) int number, String title, String videoUrl, String thumbnailUrl,
                                       Double startSec, Double endSec, Integer durationSec) {}

    private static List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) return List.of();
        return Arrays.stream(tags.split(",")).map(String::trim).filter(t -> !t.isEmpty()).toList();
    }
}
