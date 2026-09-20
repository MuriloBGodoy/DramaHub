package com.dramahub.service;

import com.dramahub.config.DramaHubProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Guarda os videos enviados pelo Estudio na pasta dramahub.media-dir. */
@Service
public class MediaStorageService {

    private static final Set<String> ALLOWED_EXT = Set.of("mp4", "webm", "mov", "m4v");

    private final Path root;

    public MediaStorageService(DramaHubProperties props) {
        this.root = Path.of(props.mediaDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Nao foi possivel criar a pasta de midia " + root, e);
        }
    }

    /** @return nome do arquivo salvo (relativo a pasta de midia) */
    public String store(MultipartFile file) {
        String original = file.getOriginalFilename() == null ? "video.mp4" : file.getOriginalFilename();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "mp4";
        if (!ALLOWED_EXT.contains(ext)) {
            throw new IllegalArgumentException("Formato nao suportado: ." + ext + " (use mp4, webm, mov ou m4v)");
        }
        String name = UUID.randomUUID() + "." + ext;
        try {
            Files.copy(file.getInputStream(), root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao salvar o video", e);
        }
        return name;
    }

    public Resource load(String fileName) {
        Path p = root.resolve(fileName).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p)) {
            return null;
        }
        return new FileSystemResource(p);
    }

    public void delete(String fileName) {
        if (fileName == null) return;
        try {
            Files.deleteIfExists(root.resolve(fileName).normalize());
        } catch (IOException ignored) {
            // arquivo pode ja ter sido removido manualmente
        }
    }

    public static String contentType(String fileName) {
        String ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case "webm" -> "video/webm";
            case "mov" -> "video/quicktime";
            default -> "video/mp4";
        };
    }
}
