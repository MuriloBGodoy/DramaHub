package com.dramahub.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "favorite", uniqueConstraints = @UniqueConstraint(columnNames = {"profile", "series_id"}))
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String profile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "series_id")
    private Series series;

    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public String getProfile() { return profile; }
    public void setProfile(String profile) { this.profile = profile; }
    public Series getSeries() { return series; }
    public void setSeries(Series series) { this.series = series; }
    public Instant getCreatedAt() { return createdAt; }
}
