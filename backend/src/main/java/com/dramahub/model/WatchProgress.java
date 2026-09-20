package com.dramahub.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "watch_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"profile", "episode_id"}))
public class WatchProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String profile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "episode_id")
    private Episode episode;

    private double positionSec;

    private boolean completed;

    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public String getProfile() { return profile; }
    public void setProfile(String profile) { this.profile = profile; }
    public Episode getEpisode() { return episode; }
    public void setEpisode(Episode episode) { this.episode = episode; }
    public double getPositionSec() { return positionSec; }
    public void setPositionSec(double positionSec) { this.positionSec = positionSec; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
