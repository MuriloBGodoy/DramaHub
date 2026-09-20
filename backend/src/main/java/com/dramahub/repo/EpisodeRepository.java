package com.dramahub.repo;

import com.dramahub.model.Episode;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EpisodeRepository extends JpaRepository<Episode, Long> {

    @EntityGraph(attributePaths = "series")
    Optional<Episode> findWithSeriesById(Long id);

    @EntityGraph(attributePaths = "series")
    Optional<Episode> findBySeriesIdAndNumber(Long seriesId, int number);

    int countBySeriesId(Long seriesId);

    /** Primeiro episodio de cada serie - base do feed "Para voce". */
    @Query("select e from Episode e join fetch e.series s where e.number = 1 order by s.featured desc, s.createdAt desc")
    List<Episode> findFeedEpisodes();
}
