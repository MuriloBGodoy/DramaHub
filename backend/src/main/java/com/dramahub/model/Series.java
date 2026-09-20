package com.dramahub.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "series")
public class Series {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String synopsis;

    private String coverUrl;

    private String genre;

    /** tags separadas por virgula, ex: "romance,ceo,vinganca" */
    private String tags;

    /** Origem do conteudo: "ai" (gerado por IA) ou "cc" (Creative Commons) */
    private String source;

    /** Credito / licenca exibido no app */
    private String credit;

    private boolean featured;

    /** Roteiro gerado pelo Roteirista IA (JSON), quando a serie nasce no Estudio. */
    @Lob
    @Column(length = 200000)
    private String script;

    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "series", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("number ASC")
    private List<Episode> episodes = new ArrayList<>();

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSynopsis() { return synopsis; }
    public void setSynopsis(String synopsis) { this.synopsis = synopsis; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCredit() { return credit; }
    public void setCredit(String credit) { this.credit = credit; }
    public String getScript() { return script; }
    public void setScript(String script) { this.script = script; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public Instant getCreatedAt() { return createdAt; }
    public List<Episode> getEpisodes() { return episodes; }

    public void addEpisode(Episode e) {
        e.setSeries(this);
        episodes.add(e);
    }
}
