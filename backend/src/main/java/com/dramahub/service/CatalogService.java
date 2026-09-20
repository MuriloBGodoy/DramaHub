package com.dramahub.service;

import com.dramahub.dto.Dtos.*;
import com.dramahub.model.Episode;
import com.dramahub.model.Series;
import com.dramahub.repo.EpisodeRepository;
import com.dramahub.repo.SeriesRepository;
import com.dramahub.web.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@Transactional
public class CatalogService {

    private final SeriesRepository seriesRepo;
    private final EpisodeRepository episodeRepo;
    private final MediaStorageService storage;

    public CatalogService(SeriesRepository seriesRepo, EpisodeRepository episodeRepo, MediaStorageService storage) {
        this.seriesRepo = seriesRepo;
        this.episodeRepo = episodeRepo;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public List<SeriesSummary> search(String genre, String source, String q) {
        String g = blankToNull(genre);
        String query = blankToNull(q);
        return seriesRepo.search(g, blankToNull(source), query).stream()
                .map(s -> SeriesSummary.of(s, episodeRepo.countBySeriesId(s.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> genres() {
        return seriesRepo.findAllGenres();
    }

    @Transactional(readOnly = true)
    public SeriesDetail detail(Long id) {
        return seriesRepo.findWithEpisodesById(id).map(SeriesDetail::of)
                .orElseThrow(() -> new NotFoundException("Serie nao encontrada: " + id));
    }

    @Transactional(readOnly = true)
    public EpisodeDto episode(Long id) {
        Episode e = episodeRepo.findWithSeriesById(id)
                .orElseThrow(() -> new NotFoundException("Episodio nao encontrado: " + id));
        return EpisodeDto.of(e, e.getSeries());
    }

    @Transactional(readOnly = true)
    public List<EpisodeDto> feed() {
        return episodeRepo.findFeedEpisodes().stream().map(e -> EpisodeDto.of(e, e.getSeries())).toList();
    }

    public SeriesDetail createSeries(CreateSeriesRequest req) {
        Series s = new Series();
        s.setTitle(req.title().trim());
        s.setSynopsis(req.synopsis());
        s.setCoverUrl(blankToNull(req.coverUrl()));
        s.setGenre(blankToNull(req.genre()));
        s.setTags(blankToNull(req.tags()));
        s.setSource(req.source() == null ? "ai" : req.source());
        s.setCredit(blankToNull(req.credit()));
        s.setFeatured(Boolean.TRUE.equals(req.featured()));
        s.setScript(blankToNull(req.script()));
        return SeriesDetail.of(seriesRepo.save(s));
    }

    public SeriesDetail updateSeries(Long id, UpdateSeriesRequest req) {
        Series s = seriesRepo.findWithEpisodesById(id)
                .orElseThrow(() -> new NotFoundException("Serie nao encontrada: " + id));
        if (blankToNull(req.title()) != null) s.setTitle(req.title().trim());
        if (req.synopsis() != null) s.setSynopsis(req.synopsis());
        if (req.coverUrl() != null) s.setCoverUrl(blankToNull(req.coverUrl()));
        if (blankToNull(req.genre()) != null) s.setGenre(req.genre());
        if (req.tags() != null) s.setTags(blankToNull(req.tags()));
        if (req.credit() != null) s.setCredit(blankToNull(req.credit()));
        if (req.featured() != null) s.setFeatured(req.featured());
        if (req.script() != null) s.setScript(blankToNull(req.script()));
        return SeriesDetail.of(seriesRepo.save(s));
    }

    public void deleteSeries(Long id) {
        Series s = seriesRepo.findWithEpisodesById(id)
                .orElseThrow(() -> new NotFoundException("Serie nao encontrada: " + id));
        s.getEpisodes().forEach(e -> storage.delete(e.getVideoFile()));
        seriesRepo.delete(s);
    }

    /** Cria um episodio. O video pode vir por URL externa ou por upload (arquivo gerado por IA). */
    public EpisodeDto addEpisode(Long seriesId, CreateEpisodeRequest req, MultipartFile file) {
        Series s = seriesRepo.findById(seriesId)
                .orElseThrow(() -> new NotFoundException("Serie nao encontrada: " + seriesId));
        if (episodeRepo.findBySeriesIdAndNumber(seriesId, req.number()).isPresent()) {
            throw new IllegalArgumentException("Ja existe o episodio " + req.number() + " nessa serie");
        }
        Episode e = new Episode();
        e.setSeries(s);
        e.setNumber(req.number());
        e.setTitle(blankToNull(req.title()) == null ? "Episodio " + req.number() : req.title().trim());
        e.setThumbnailUrl(blankToNull(req.thumbnailUrl()));
        e.setStartSec(req.startSec());
        e.setEndSec(req.endSec());
        e.setDurationSec(req.durationSec());

        if (file != null && !file.isEmpty()) {
            e.setVideoFile(storage.store(file));
        } else if (blankToNull(req.videoUrl()) != null) {
            e.setVideoUrl(req.videoUrl().trim());
        } else {
            throw new IllegalArgumentException("Informe um arquivo de video ou uma videoUrl");
        }
        return EpisodeDto.of(episodeRepo.save(e), s);
    }

    public void deleteEpisode(Long id) {
        Episode e = episodeRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Episodio nao encontrado: " + id));
        storage.delete(e.getVideoFile());
        episodeRepo.delete(e);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
