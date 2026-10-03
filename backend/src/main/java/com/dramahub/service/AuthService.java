package com.dramahub.service;

import com.dramahub.config.DramaHubProperties;
import com.dramahub.model.Device;
import com.dramahub.model.User;
import com.dramahub.repo.DeviceRepository;
import com.dramahub.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Sessoes anonimas, sem login: cada navegador ganha um perfil proprio na primeira visita e guarda o token.
 * O token e opaco (32 bytes aleatorios) e so o hash fica no banco. Progresso e favoritos ficam na sessao.
 */
@Service
@Transactional
public class AuthService {

    public record Session(User user, Device device, String token) {}

    private final UserRepository users;
    private final DeviceRepository devices;
    private final DramaHubProperties props;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, DeviceRepository devices, DramaHubProperties props) {
        this.users = users;
        this.devices = devices;
        this.props = props;
    }

    /** Cria um perfil novo para este navegador. */
    public Session newSession(String name, String avatar, String deviceName) {
        User u = new User();
        u.setName(name == null || name.isBlank() ? "Visitante" : name.trim());
        u.setAvatar(avatar == null || avatar.isBlank() ? "🍿" : avatar);
        // colunas herdadas da versao com contas (NOT NULL / unique)
        u.setEmail("sessao-" + randomToken().substring(0, 16).toLowerCase() + "@dramahub.local");
        u.setPasswordHash("");
        u.setRole(User.Role.USER);
        users.save(u);

        String token = randomToken();
        Device d = new Device();
        d.setUser(u);
        d.setTokenHash(sha256(token));
        d.setName(deviceName == null || deviceName.isBlank() ? "Navegador" : deviceName.trim());
        devices.save(d);
        return new Session(u, d, token);
    }

    @Transactional(readOnly = true)
    public Optional<Device> authenticate(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        return devices.findByTokenHash(sha256(token));
    }

    public void touch(Device d) {
        if (d.getLastSeenAt().isBefore(Instant.now().minusSeconds(300))) {
            d.setLastSeenAt(Instant.now());
            devices.save(d);
        }
    }

    /** Sem ADMIN_CODE configurado (uso local) qualquer sessao pode mexer no catalogo. */
    public boolean isAdmin(User u) {
        return u.getRole() == User.Role.ADMIN || !adminCodeRequired();
    }

    public boolean adminCodeRequired() {
        return props.adminCode() != null && !props.adminCode().isBlank();
    }

    /** Libera o Estudio para esta sessao com o ADMIN_CODE. */
    public User unlockAdmin(User u, String code) {
        if (adminCodeRequired() && !props.adminCode().equals(code)) {
            throw new IllegalArgumentException("Código incorreto");
        }
        u.setRole(User.Role.ADMIN);
        return users.save(u);
    }

    public User update(User u, String name, String avatar) {
        if (name != null && !name.isBlank()) u.setName(name.trim());
        if (avatar != null && !avatar.isBlank()) u.setAvatar(avatar);
        return users.save(u);
    }

    /** Encerra a sessao deste navegador. */
    public void end(Device d) {
        devices.delete(d);
    }

    // ---------- util ----------

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
