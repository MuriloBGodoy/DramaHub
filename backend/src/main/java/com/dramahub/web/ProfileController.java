package com.dramahub.web;

import com.dramahub.dto.Dtos.*;
import com.dramahub.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Progresso e favoritos do usuario logado. */
@RestController
@RequestMapping("/api/me")
public class ProfileController {

    private final ProfileService profiles;

    public ProfileController(ProfileService profiles) {
        this.profiles = profiles;
    }

    private static String key(HttpServletRequest req) {
        return AuthController.current(req).profileKey();
    }

    @PutMapping("/progress/{episodeId}")
    public ProgressDto saveProgress(@PathVariable Long episodeId, @RequestBody SaveProgressRequest body, HttpServletRequest req) {
        return profiles.saveProgress(key(req), episodeId, body);
    }

    @GetMapping("/progress/series/{seriesId}")
    public List<ProgressDto> seriesProgress(@PathVariable Long seriesId, HttpServletRequest req) {
        return profiles.seriesProgress(key(req), seriesId);
    }

    @GetMapping("/continue")
    public List<ContinueWatchingDto> continueWatching(HttpServletRequest req) {
        return profiles.continueWatching(key(req));
    }

    @GetMapping("/favorites")
    public List<SeriesSummary> favorites(HttpServletRequest req) {
        return profiles.favorites(key(req));
    }

    @GetMapping("/favorites/{seriesId}")
    public Map<String, Boolean> isFavorite(@PathVariable Long seriesId, HttpServletRequest req) {
        return Map.of("favorite", profiles.isFavorite(key(req), seriesId));
    }

    @PostMapping("/favorites/{seriesId}/toggle")
    public Map<String, Boolean> toggleFavorite(@PathVariable Long seriesId, HttpServletRequest req) {
        return Map.of("favorite", profiles.toggleFavorite(key(req), seriesId));
    }
}
