package com.dramahub.web;

import com.dramahub.config.DramaHubProperties;
import com.dramahub.model.Device;
import com.dramahub.model.User;
import com.dramahub.repo.UserRepository;
import com.dramahub.service.AuthService;
import com.dramahub.service.AuthService.Session;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record UserDto(Long id, String name, String email, String avatar, String role) {
        static UserDto of(User u) { return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getAvatar(), u.getRole().name()); }
    }
    public record DeviceDto(Long id, String name, Instant createdAt, Instant lastSeenAt, boolean current) {}
    public record SessionDto(String token, UserDto user) {}
    public record RegisterRequest(String name, String email, String password, String avatar, String inviteCode, String deviceName) {}
    public record LoginRequest(String email, String password, String deviceName) {}
    public record UpdateRequest(String name, String avatar, String newPassword, String currentPassword) {}
    public record ClaimRequest(String profile) {}

    private final AuthService auth;
    private final UserRepository users;
    private final DramaHubProperties props;

    public AuthController(AuthService auth, UserRepository users, DramaHubProperties props) {
        this.auth = auth;
        this.users = users;
        this.props = props;
    }

    /** Publico: diz se o cadastro exige convite e se ja existe algum usuario (primeiro vira admin). */
    @GetMapping("/status")
    public Map<String, Object> status() {
        boolean invite = props.inviteCode() != null && !props.inviteCode().isBlank();
        return Map.of("inviteRequired", invite, "hasUsers", users.count() > 0);
    }

    @PostMapping("/register")
    public SessionDto register(@RequestBody RegisterRequest r, HttpServletRequest req) {
        Session s = auth.register(r.name(), r.email(), r.password(), r.avatar(), r.inviteCode(), deviceName(r.deviceName(), req));
        return new SessionDto(s.token(), UserDto.of(s.user()));
    }

    @PostMapping("/login")
    public SessionDto login(@RequestBody LoginRequest r, HttpServletRequest req) {
        Session s = auth.login(r.email(), r.password(), deviceName(r.deviceName(), req));
        return new SessionDto(s.token(), UserDto.of(s.user()));
    }

    @GetMapping("/me")
    public UserDto me(HttpServletRequest req) {
        return UserDto.of(current(req));
    }

    @PutMapping("/me")
    public UserDto update(@RequestBody UpdateRequest r, HttpServletRequest req) {
        return UserDto.of(auth.update(current(req), r.name(), r.avatar(), r.newPassword(), r.currentPassword()));
    }

    @GetMapping("/devices")
    public List<DeviceDto> devices(HttpServletRequest req) {
        Device cur = (Device) req.getAttribute("dramahub.device");
        return auth.devicesOf(current(req)).stream()
                .map(d -> new DeviceDto(d.getId(), d.getName(), d.getCreatedAt(), d.getLastSeenAt(), d.getId().equals(cur.getId())))
                .toList();
    }

    @DeleteMapping("/devices/{id}")
    public Map<String, Boolean> revoke(@PathVariable Long id, HttpServletRequest req) {
        auth.revoke(current(req), id);
        return Map.of("ok", true);
    }

    /** Sai deste dispositivo. */
    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest req) {
        Device cur = (Device) req.getAttribute("dramahub.device");
        auth.revoke(current(req), cur.getId());
        return Map.of("ok", true);
    }

    /** Traz o progresso/favoritos de um perfil antigo (sem login) para esta conta. */
    @PostMapping("/claim")
    public Map<String, Integer> claim(@RequestBody ClaimRequest r, HttpServletRequest req) {
        return Map.of("moved", auth.claimProfile(current(req), r.profile()));
    }

    static User current(HttpServletRequest req) {
        return (User) req.getAttribute(AuthFilter.USER_ATTR);
    }

    /** Nome do dispositivo a partir do User-Agent quando o cliente nao informa. */
    private static String deviceName(String given, HttpServletRequest req) {
        if (given != null && !given.isBlank()) return given;
        String ua = String.valueOf(req.getHeader("User-Agent"));
        String os = ua.contains("iPhone") ? "iPhone" : ua.contains("iPad") ? "iPad" : ua.contains("Android") ? "Android"
                : ua.contains("Windows") ? "Windows" : ua.contains("Mac") ? "Mac" : ua.contains("Linux") ? "Linux" : "Dispositivo";
        String browser = ua.contains("Edg/") ? "Edge" : ua.contains("Chrome/") ? "Chrome" : ua.contains("Firefox/") ? "Firefox"
                : ua.contains("Safari/") ? "Safari" : "Navegador";
        return browser + " · " + os;
    }
}
