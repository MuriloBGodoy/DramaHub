package com.dramahub.web;

import com.dramahub.service.ImportService;
import com.dramahub.service.ImportService.ImportRequest;
import com.dramahub.service.ImportService.ImportResult;
import com.dramahub.service.YouTubeService.Preview;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Importacao de series a partir de playlists/videos oficiais do YouTube. */
@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final ImportService imports;

    public ImportController(ImportService imports) {
        this.imports = imports;
    }

    /** Le a playlist/video e lista o que seria importado (com disponibilidade de cada video). */
    @GetMapping("/preview")
    public Preview preview(@RequestParam String url) {
        return imports.preview(url);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ImportResult run(@Valid @RequestBody ImportRequest req) {
        return imports.importFromYouTube(req);
    }
}
