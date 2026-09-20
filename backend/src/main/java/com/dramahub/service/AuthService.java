package com.dramahub.service;

import com.dramahub.config.DramaHubProperties;
import com.dramahub.model.Device;
import com.dramahub.model.Favorite;
import com.dramahub.model.User;
import com.dramahub.model.WatchProgress;
import com.dramahub.repo.DeviceRepository;
import com.dramahub.repo.FavoriteRepository;
import com.dramahub.repo.UserRepository;
import com.dramahub.repo.WatchProgressRepository;
import com.dramahub.web.NotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/** Contas e sessoes por dispositivo. O token e opaco (32 bytes aleatorios) e so o hash fica no banco. */
@Service
@Transactional
public class AuthService {

    public record Session(User user, Device device, String token) {}

    private final UserRepository users;
    private final DeviceRepository devices;
    private final WatchProgressRepository progressRepo;
    private final FavoriteRepository favoriteRepo;
    private final DramaHubProperties props;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, DeviceRepository devices, WatchProgressRepository progressRepo,
                       FavoriteRepository favoriteRepo, DramaHubProperties props) {
        this.users = users;
        this.devices = devices;
        this.progressRepo = progressRepo;
        this.favoriteRepo = favoriteRepo;
        this.props = props;
    }

    public Session register(String name, String email, String password, String avatar, String inviteCode, String deviceName) {
        String required = props.inviteCode();
        if (required != null && !required.isBlank() && !required.equals(inviteCode)) {
            throw new IllegalArgumentException("Código de convite inválido");
        }
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Informe seu nome");
        if (email == null || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw new IllegalArgumentException("E-mail inválido");
        if (password == null || password.length() < 6) throw new IllegalArgumentException("A senha precisa ter pelo menos 6 caracteres");
        if (users.existsByEmailIgnoreCase(email)) throw new IllegalArgumentException("Já existe uma conta com esse e-mail");

        User u = new User();
        u.setName(name.trim());
        u.setEmail(email.trim().toLowerCase());
        u.setAvatar(avatar == null || avatar.isBlank() ? "🍿" : avatar);
        u.setPasswordHash(encoder.encode(password));
        u.setRole(users.count() == 0 ? User.Role.ADMIN : User.Role.USER); // primeiro usuario administra
        users.save(u);
        return newSession(u, deviceName);
    }

    public Session login(String email, String password, String deviceName) {
        User u = users.findByEmailIgnoreCase(email == null ? "" : email.trim())
                .filter(x -> encoder.matches(password == null ? "" : password, x.getPasswordHash()))
                .orElseThrow(() -> new IllegalArgumentException("E-mail ou senha incorretos"));
        return newSession(u, deviceName);
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

    @Transactional(readOnly = true)
    public List<Device> devicesOf(User u) {
        return devices.findByUserIdOrderByLastSeenAtDesc(u.getId());
    }

    public void revoke(User u, Long deviceId) {
        Device d = devices.findByIdAndUserId(deviceId, u.getId())
                .orElseThrow(() -> new NotFoundException("Dispositivo não encontrado"));
        devices.delete(d);
    }

    public User update(User u, String name, String avatar, String newPassword, String currentPassword) {
        if (name != null && !name.isBlank()) u.setName(name.trim());
        if (avatar != null && !avatar.isBlank()) u.setAvatar(avatar);
        if (newPassword != null && !newPassword.isBlank()) {
            if (!encoder.matches(currentPassword == null ? "" : currentPassword, u.getPasswordHash())) {
                throw new IllegalArgumentException("Senha atual incorreta");
            }
            if (newPassword.length() < 6) throw new IllegalArgumentException("A nova senha precisa ter pelo menos 6 caracteres");
            u.setPasswordHash(encoder.encode(newPassword));
        }
        return users.save(u);
    }

    /**
     * Migra progresso/favoritos de um perfil antigo sem login (ex: "julia") para a conta.
     * Em conflito (mesmo episodio/serie nos dois), fica o registro mais recente.
     */
    public int claimProfile(User u, String oldProfile) {
        if (oldProfile == null || oldProfile.isBlank() || oldProfile.startsWith("u")) return 0;
        String mine = u.profileKey();
        int moved = 0;
        for (WatchProgress p : progressRepo.findAllByProfile(oldProfile)) {
            Optional<WatchProgress> existing = progressRepo.findByProfileAndEpisodeId(mine, p.getEpisode().getId());
            if (existing.isPresent()) {
                if (existing.get().getUpdatedAt().isBefore(p.getUpdatedAt())) {
                    existing.get().setPositionSec(p.getPositionSec());
                    existing.get().setCompleted(p.isCompleted());
                    existing.get().setUpdatedAt(p.getUpdatedAt());
                }
                progressRepo.delete(p);
            } else {
                p.setProfile(mine);
                moved++;
            }
        }
        for (Favorite f : favoriteRepo.findAllByProfile(oldProfile)) {
            if (favoriteRepo.existsByProfileAndSeriesId(mine, f.getSeries().getId())) favoriteRepo.delete(f);
            else { f.setProfile(mine); moved++; }
        }
        return moved;
    }

    // ---------- util ----------

    private Session newSession(User u, String deviceName) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Device d = new Device();
        d.setUser(u);
        d.setTokenHash(sha256(token));
        d.setName(deviceName == null || deviceName.isBlank() ? "Dispositivo" : deviceName.trim());
        devices.save(d);
        return new Session(u, d, token);
    }

    static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
