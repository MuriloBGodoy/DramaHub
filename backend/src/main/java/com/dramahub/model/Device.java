package com.dramahub.model;

import jakarta.persistence.*;

import java.time.Instant;

/** Sessao de um navegador. O token (aleatorio) e guardado apenas como hash SHA-256. */
@Entity
@Table(name = "device", indexes = @Index(columnList = "tokenHash", unique = true))
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 64)
    private String tokenHash;

    /** ex: "Chrome · Android" */
    private String name;

    private Instant createdAt = Instant.now();

    private Instant lastSeenAt = Instant.now();

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
