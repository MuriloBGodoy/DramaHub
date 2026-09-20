package com.dramahub.web;

import com.dramahub.model.Episode;
import com.dramahub.repo.EpisodeRepository;
import com.dramahub.service.MediaStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serve os videos enviados pelo Estudio. Retornar um Resource faz o Spring MVC
 * tratar o header Range automaticamente (206 Partial Content), entao o seek do player funciona.
 */
@RestController
@RequestMapping("/api/stream")
public class StreamController {

    private final EpisodeRepository episodeRepo;
    private final MediaStorageService storage;

    public StreamController(EpisodeRepository episodeRepo, MediaStorageService storage) {
        this.episodeRepo = episodeRepo;
        this.storage = storage;
    }

    @GetMapping("/{episodeId}")
    public ResponseEntity<Resource> stream(@PathVariable Long episodeId) {
        Episode e = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new NotFoundException("Episodio nao encontrado: " + episodeId));
        if (e.getVideoFile() == null) {
            throw new NotFoundException("Esse episodio usa um video externo");
        }
        Resource video = storage.load(e.getVideoFile());
        if (video == null) {
            throw new NotFoundException("Arquivo de video nao encontrado no disco");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(MediaType.parseMediaType(MediaStorageService.contentType(e.getVideoFile())))
                .body(video);
    }
}
