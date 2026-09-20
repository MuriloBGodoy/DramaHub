package com.dramahub.web;

import com.dramahub.service.ScriptService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

import java.util.Map;

/** Roteirista IA (somente admin - o AuthFilter bloqueia escrita em /api/ai para nao-admins). */
@RestController
@RequestMapping("/api/ai")
public class ScriptController {

    public record ScriptRequest(@NotBlank String premise, String genre, Integer episodes, String tone) {}

    private final ScriptService scripts;

    public ScriptController(ScriptService scripts) {
        this.scripts = scripts;
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", scripts.enabled());
    }

    @PostMapping("/script")
    public JsonNode script(@Valid @RequestBody ScriptRequest req) {
        return scripts.generate(req.premise(), req.genre(), req.episodes() == null ? 6 : req.episodes(), req.tone());
    }
}
