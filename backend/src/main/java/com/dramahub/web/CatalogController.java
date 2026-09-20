package com.dramahub.web;

import com.dramahub.dto.Dtos.*;
import com.dramahub.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalog;

    public CatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    // ---------- leitura ----------

    @GetMapping("/series")
    public List<SeriesSummary> list(@RequestParam(required = false) String genre,
                                    @RequestParam(required = false) String source,
                                    @RequestParam(required = false) String q) {
        return catalog.search(genre, source, q);
    }

    @GetMapping("/genres")
    public List<String> genres() {
        return catalog.genres();
    }

    @GetMapping("/series/{id}")
    public SeriesDetail detail(@PathVariable Long id) {
        return catalog.detail(id);
    }

    @GetMapping("/episodes/{id}")
    public EpisodeDto episode(@PathVariable Long id) {
        return catalog.episode(id);
    }

    /** Feed vertical "Para voce": primeiro episodio de cada serie. */
    @GetMapping("/feed")
    public List<EpisodeDto> feed() {
        return catalog.feed();
    }

    // ---------- Estudio (cadastro de conteudo) ----------

    @PostMapping("/series")
    @ResponseStatus(HttpStatus.CREATED)
    public SeriesDetail create(@Valid @RequestBody CreateSeriesRequest req) {
        return catalog.createSeries(req);
    }

    @PutMapping("/series/{id}")
    public SeriesDetail update(@PathVariable Long id, @RequestBody UpdateSeriesRequest req) {
        return catalog.updateSeries(id, req);
    }

    @DeleteMapping("/series/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSeries(@PathVariable Long id) {
        catalog.deleteSeries(id);
    }

    /** Episodio por URL externa (JSON). */
    @PostMapping(value = "/series/{id}/episodes", consumes = "application/json")
    @ResponseStatus(HttpStatus.CREATED)
    public EpisodeDto addEpisode(@PathVariable Long id, @Valid @RequestBody CreateEpisodeRequest req) {
        return catalog.addEpisode(id, req, null);
    }

    /** Episodio com upload de arquivo (multipart) - fluxo dos videos gerados por IA. */
    @PostMapping(value = "/series/{id}/episodes", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public EpisodeDto uploadEpisode(@PathVariable Long id,
                                    @RequestParam int number,
                                    @RequestParam(required = false) String title,
                                    @RequestParam(required = false) String thumbnailUrl,
                                    @RequestParam(required = false) Integer durationSec,
                                    @RequestPart("file") MultipartFile file) {
        var req = new CreateEpisodeRequest(number, title, null, thumbnailUrl, null, null, durationSec);
        return catalog.addEpisode(id, req, file);
    }

    @DeleteMapping("/episodes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEpisode(@PathVariable Long id) {
        catalog.deleteEpisode(id);
    }
}
