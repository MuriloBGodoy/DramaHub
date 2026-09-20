package com.dramahub.model;

import jakarta.persistence.*;

@Entity
@Table(name = "episode", uniqueConstraints = @UniqueConstraint(columnNames = {"series_id", "number"}))
public class Episode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "series_id")
    private Series series;

    @Column(nullable = false)
    private int number;

    private String title;

    /** URL externa do video (mp4). Usado quando o video nao esta na pasta media. */
    private String videoUrl;

    /** Nome do arquivo dentro de dramahub.media-dir (upload feito pelo Estudio). */
    private String videoFile;

    /** ID do video no YouTube (embed oficial). Exclusivo com videoUrl/videoFile. */
    private String youtubeId;

    private String thumbnailUrl;

    /** Recorte opcional dentro do arquivo: permite dividir um video longo em varios episodios. */
    private Double startSec;
    private Double endSec;

    private Integer durationSec;

    public Long getId() { return id; }
    public Series getSeries() { return series; }
    public void setSeries(Series series) { this.series = series; }
    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public String getVideoFile() { return videoFile; }
    public void setVideoFile(String videoFile) { this.videoFile = videoFile; }
    public String getYoutubeId() { return youtubeId; }
    public void setYoutubeId(String youtubeId) { this.youtubeId = youtubeId; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    public Double getStartSec() { return startSec; }
    public void setStartSec(Double startSec) { this.startSec = startSec; }
    public Double getEndSec() { return endSec; }
    public void setEndSec(Double endSec) { this.endSec = endSec; }
    public Integer getDurationSec() { return durationSec; }
    public void setDurationSec(Integer durationSec) { this.durationSec = durationSec; }
}
