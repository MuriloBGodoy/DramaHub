package com.dramahub.service;

import com.dramahub.dto.Dtos.*;
import com.dramahub.model.Episode;
import com.dramahub.model.Favorite;
import com.dramahub.model.Series;
import com.dramahub.model.WatchProgress;
import com.dramahub.repo.EpisodeRepository;
import com.dramahub.repo.FavoriteRepository;
import com.dramahub.repo.SeriesRepository;
import com.dramahub.repo.WatchProgressRepository;
import com.dramahub.web.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/** Progresso e favoritos por perfil (ex: "julia", "murilo"). Sem login: o perfil e escolhido no app. */
@Service
@Transactional
public class ProfileService {

    private final WatchProgressRepository progressRepo;
    private final FavoriteRepository favoriteRepo;
    private final EpisodeRepository episodeRepo;
    private final SeriesRepository seriesRepo;

    public ProfileService(WatchProgressRepository progressRepo, FavoriteRepository favoriteRepo,
                          EpisodeRepository episodeRepo, SeriesRepository seriesRepo) {
        this.progressRepo = progressRepo;
        this.favoriteRepo = favoriteRepo;
        this.episodeRepo = episodeRepo;
        this.seriesRepo = seriesRepo;
    }

    public ProgressDto saveProgress(String profile, Long episodeId, SaveProgressRequest req) {
        Episode e = episodeRepo.findWithSeriesById(episodeId)
                .orElseThrow(() -> new NotFoundException("Episodio nao encontrado: " + episodeId));
        WatchProgress p = progressRepo.findByProfileAndEpisodeId(profile, episodeId).orElseGet(() -> {
            WatchProgress np = new WatchProgress();
            np.setProfile(profile);
            np.setEpisode(e);
            return np;
        });
        p.setPositionSec(Math.max(0, req.positionSec() == null ? 0 : req.positionSec()));
        p.setCompleted(Boolean.TRUE.equals(req.completed()));
        p.setUpdatedAt(Instant.now());
        return ProgressDto.of(progressRepo.save(p));
    }

    @Transactional(readOnly = true)
    public List<ProgressDto> seriesProgress(String profile, Long seriesId) {
        return progressRepo.findBySeries(profile, seriesId).stream().map(ProgressDto::of).toList();
    }

    @Transactional(readOnly = true)
    public List<ContinueWatchingDto> continueWatching(String profile) {
        return progressRepo.findContinueWatching(profile).stream().map(p -> {
            Series s = p.getEpisode().getSeries();
            return new ContinueWatchingDto(SeriesSummary.of(s, episodeRepo.countBySeriesId(s.getId())), ProgressDto.of(p));
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<SeriesSummary> favorites(String profile) {
        return favoriteRepo.findByProfileOrderByCreatedAtDesc(profile).stream()
                .map(f -> SeriesSummary.of(f.getSeries(), episodeRepo.countBySeriesId(f.getSeries().getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(String profile, Long seriesId) {
        return favoriteRepo.existsByProfileAndSeriesId(profile, seriesId);
    }

    public boolean toggleFavorite(String profile, Long seriesId) {
        var existing = favoriteRepo.findByProfileAndSeriesId(profile, seriesId);
        if (existing.isPresent()) {
            favoriteRepo.delete(existing.get());
            return false;
        }
        Series s = seriesRepo.findById(seriesId)
                .orElseThrow(() -> new NotFoundException("Serie nao encontrada: " + seriesId));
        Favorite f = new Favorite();
        f.setProfile(profile);
        f.setSeries(s);
        favoriteRepo.save(f);
        return true;
    }
}
