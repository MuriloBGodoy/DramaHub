package com.dramahub.service;

import com.dramahub.dto.Dtos.SeriesSummary;
import com.dramahub.model.Episode;
import com.dramahub.model.Series;
import com.dramahub.repo.SeriesRepository;
import com.dramahub.service.YouTubeService.Preview;
import com.dramahub.service.YouTubeService.Video;
import jakarta.validation.constraints.NotBlank;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Importa playlists/videos oficiais do YouTube como series do catalogo. */
@Service
public class ImportService {

    public record ImportEpisode(String videoId, String title) {}

    /**
     * mode = "series": a playlist inteira vira UMA serie (cada video = 1 episodio).
     * mode = "collection": cada video vira uma serie propria com 1 episodio (drama completo num video so).
     */
    public record ImportRequest(@NotBlank String url, String mode, String title, String synopsis, String genre,
                                String tags, String coverUrl, String credit, Boolean featured,
                                List<ImportEpisode> episodes,
                                /** filtros opcionais quando "episodes" nao e informado */
                                Integer minDurationSec, String titleRegex, String excludeRegex,
                                /** origem exibida no app: "yt" (padrao) ou "ai" (canal de dramas gerados por IA) */
                                String source) {}

    public record ImportResult(List<SeriesSummary> created, int episodes, List<String> skipped) {}

    private static final Pattern EP_NUMBER = Pattern.compile("(?i)\\b(?:EP|EPIS[OÓ]DIO|CAP[IÍ]TULO)\\.?\\s*0*(\\d{1,3})\\b");
    private static final Pattern BRACKETS = Pattern.compile("[\\[【(（][^\\]】)）]*[\\]】)）]");
    private static final Pattern EMOJI = Pattern.compile("[\\p{So}\\p{Cn}\\uFE0F\\u200D]+");
    private static final Pattern CJK_TITLE = Pattern.compile("《([^》]+)》");
    private static final Pattern CJK_CHARS = Pattern.compile("[\\p{IsHan}\\p{IsHiragana}\\p{IsKatakana}\\p{IsHangul}]+");
    private static final Pattern TRAILING_CHANNEL = Pattern.compile("\\s*[|｜#].*$");

    private final YouTubeService youtube;
    private final SeriesRepository seriesRepo;

    public ImportService(YouTubeService youtube, SeriesRepository seriesRepo) {
        this.youtube = youtube;
        this.seriesRepo = seriesRepo;
    }

    public Preview preview(String url) {
        return youtube.preview(url);
    }

    @Transactional
    public ImportResult importFromYouTube(ImportRequest req) {
        Preview preview = youtube.preview(req.url());
        Map<String, Video> byId = new LinkedHashMap<>();
        preview.videos().forEach(v -> byId.put(v.videoId(), v));

        // Selecao: a lista enviada pelo cliente (na ordem dela) ou todos os videos da playlist
        List<Video> selected = new ArrayList<>();
        Map<String, String> customTitles = new HashMap<>();
        if (req.episodes() != null && !req.episodes().isEmpty()) {
            for (ImportEpisode ie : req.episodes()) {
                Video v = byId.get(ie.videoId());
                if (v != null) {
                    selected.add(v);
                    if (ie.title() != null && !ie.title().isBlank()) customTitles.put(v.videoId(), ie.title().trim());
                }
            }
        } else {
            Pattern include = blank(req.titleRegex()) ? null : Pattern.compile(req.titleRegex(), Pattern.CASE_INSENSITIVE);
            Pattern exclude = blank(req.excludeRegex()) ? null : Pattern.compile(req.excludeRegex(), Pattern.CASE_INSENSITIVE);
            for (Video v : preview.videos()) {
                if (req.minDurationSec() != null && (v.durationSec() == null || v.durationSec() < req.minDurationSec())) continue;
                if (include != null && !include.matcher(v.title()).find()) continue;
                if (exclude != null && exclude.matcher(v.title()).find()) continue;
                selected.add(v);
            }
        }

        List<String> skipped = new ArrayList<>();
        List<Video> ok = new ArrayList<>();
        for (Video v : selected) {
            if (v.available()) ok.add(v);
            else skipped.add(v.videoId() + " - " + v.title() + " (indisponivel)");
        }
        if (ok.isEmpty()) throw new IllegalArgumentException("Nenhum video disponivel para importar (confira os filtros)");

        // Nao duplicar: ignora videos que ja estao no catalogo
        Set<String> existing = new HashSet<>(seriesRepo.findAllYoutubeIds());
        List<Video> fresh = new ArrayList<>();
        for (Video v : ok) {
            if (existing.contains(v.videoId())) skipped.add(v.videoId() + " - " + v.title() + " (ja importado)");
            else fresh.add(v);
        }
        ok = fresh;
        if (ok.isEmpty()) return new ImportResult(List.of(), 0, skipped);

        String credit = blank(req.credit()) ? "YouTube · canal " + preview.channel() : req.credit();
        boolean collection = "collection".equalsIgnoreCase(req.mode());
        List<Series> created = new ArrayList<>();

        if (collection) {
            for (Video v : ok) {
                Series s = newSeries(cleanTitle(v.title()), req, credit, v.thumbnailUrl());
                s.addEpisode(newEpisode(1, "Drama completo", v));
                created.add(s);
            }
        } else {
            String title = blank(req.title()) ? cleanTitle(preview.title()) : req.title().trim();
            Series s = newSeries(title, req, credit, blank(req.coverUrl()) ? ok.get(0).thumbnailUrl() : req.coverUrl());
            // Se todos os videos tem "EP N" no titulo, usamos essa numeracao (e ordem); senao, sequencial
            Map<String, Integer> epNumbers = new HashMap<>();
            for (Video v : ok) {
                Integer n = episodeNumber(v.title());
                if (n == null) { epNumbers.clear(); break; }
                epNumbers.put(v.videoId(), n);
            }
            List<Video> ordered = new ArrayList<>(ok);
            boolean useEp = !epNumbers.isEmpty() && new HashSet<>(epNumbers.values()).size() == ok.size();
            if (useEp) ordered.sort(Comparator.comparingInt(v -> epNumbers.get(v.videoId())));
            int seq = 1;
            for (Video v : ordered) {
                int number = useEp ? epNumbers.get(v.videoId()) : seq;
                String epTitle = customTitles.getOrDefault(v.videoId(), useEp ? "Episódio " + number : cleanTitle(v.title()));
                s.addEpisode(newEpisode(number, epTitle, v));
                seq++;
            }
            created.add(s);
        }

        seriesRepo.saveAll(created);
        int episodes = created.stream().mapToInt(s -> s.getEpisodes().size()).sum();
        return new ImportResult(created.stream().map(s -> SeriesSummary.of(s, s.getEpisodes().size())).toList(), episodes, skipped);
    }

    private static Series newSeries(String title, ImportRequest req, String credit, String cover) {
        Series s = new Series();
        s.setTitle(title);
        s.setSynopsis(req.synopsis());
        s.setCoverUrl(blank(req.coverUrl()) || "collection".equalsIgnoreCase(req.mode()) ? cover : req.coverUrl());
        s.setGenre(blank(req.genre()) ? "Drama" : req.genre());
        s.setTags(req.tags());
        s.setSource(blank(req.source()) ? "yt" : req.source());
        s.setCredit(credit);
        s.setFeatured(Boolean.TRUE.equals(req.featured()));
        return s;
    }

    private static Episode newEpisode(int number, String title, Video v) {
        Episode e = new Episode();
        e.setNumber(number);
        e.setTitle(title);
        e.setYoutubeId(v.videoId());
        e.setThumbnailUrl(v.thumbnailUrl());
        e.setDurationSec(v.durationSec());
        return e;
    }

    static Integer episodeNumber(String title) {
        Matcher m = EP_NUMBER.matcher(title);
        return m.find() ? Integer.parseInt(m.group(1)) : null;
    }

    /** Remove tags entre colchetes, emojis e o sufixo "| Canal" dos titulos do YouTube. */
    static String cleanTitle(String raw) {
        if (raw == null) return "";
        Matcher cjkTitle = CJK_TITLE.matcher(raw);
        String t = cjkTitle.find() ? cjkTitle.group(1) : raw;
        t = t.replaceAll("[丨｜|].*$", " ");                // segmentos apos separadores asiaticos
        t = CJK_CHARS.matcher(t).replaceAll(" ");
        t = BRACKETS.matcher(t).replaceAll(" ");
        t = TRAILING_CHANNEL.matcher(t).replaceAll("");
        t = EMOJI.matcher(t).replaceAll(" ");
        t = t.replaceAll("\\s+", " ").trim();
        t = t.replaceAll("^[\\s\\-–|:]+|[\\s\\-–|:]+$", "");
        return t.isBlank() ? raw.trim() : t;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
