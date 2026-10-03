package com.dramahub.web;

import com.dramahub.model.Device;
import com.dramahub.model.User;
import com.dramahub.service.AuthService;
import com.dramahub.service.AuthService.Session;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Sessao anonima por navegador: sem e-mail nem senha. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record UserDto(Long id, String name, String avatar, String role) {}
    public record SessionDto(String token, UserDto user) {}
    public record SessionRequest(String name, String avatar) {}
    public record UpdateRequest(String name, String avatar) {}
    public record AdminRequest(String code) {}

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** Publico: diz se o Estudio exige codigo. */
    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("adminCodeRequired", auth.adminCodeRequired());
    }

    /** Publico: cria a sessao deste navegador. */
    @PostMapping("/session")
    public SessionDto session(@RequestBody(required = false) SessionRequest r, HttpServletRequest req) {
        Session s = auth.newSession(r == null ? null : r.name(), r == null ? null : r.avatar(), deviceName(req));
        return new SessionDto(s.token(), dto(s.user()));
    }

    @GetMapping("/me")
    public UserDto me(HttpServletRequest req) {
        return dto(current(req));
    }

    @PutMapping("/me")
    public UserDto update(@RequestBody UpdateRequest r, HttpServletRequest req) {
        return dto(auth.update(current(req), r.name(), r.avatar()));
    }

    /** Libera o Estudio nesta sessao. */
    @PostMapping("/admin")
    public UserDto admin(@RequestBody AdminRequest r, HttpServletRequest req) {
        return dto(auth.unlockAdmin(current(req), r.code()));
    }

    /** Encerra a sessao deste navegador (o cliente cria outra do zero). */
    @DeleteMapping("/session")
    public Map<String, Boolean> end(HttpServletRequest req) {
        auth.end((Device) req.getAttribute(AuthFilter.DEVICE_ATTR));
        return Map.of("ok", true);
    }

    private UserDto dto(User u) {
        return new UserDto(u.getId(), u.getName(), u.getAvatar(), auth.isAdmin(u) ? "ADMIN" : "USER");
    }

    static User current(HttpServletRequest req) {
        return (User) req.getAttribute(AuthFilter.USER_ATTR);
    }

    /** Nome do navegador a partir do User-Agent. */
    private static String deviceName(HttpServletRequest req) {
        String ua = String.valueOf(req.getHeader("User-Agent"));
        String os = ua.contains("iPhone") ? "iPhone" : ua.contains("iPad") ? "iPad" : ua.contains("Android") ? "Android"
                : ua.contains("Windows") ? "Windows" : ua.contains("Mac") ? "Mac" : ua.contains("Linux") ? "Linux" : "Dispositivo";
        String browser = ua.contains("Edg/") ? "Edge" : ua.contains("Chrome/") ? "Chrome" : ua.contains("Firefox/") ? "Firefox"
                : ua.contains("Safari/") ? "Safari" : "Navegador";
        return browser + " · " + os;
    }
}
