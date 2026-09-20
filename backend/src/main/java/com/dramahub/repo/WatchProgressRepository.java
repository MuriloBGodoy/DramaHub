package com.dramahub.repo;

import com.dramahub.model.WatchProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WatchProgressRepository extends JpaRepository<WatchProgress, Long> {

    Optional<WatchProgress> findByProfileAndEpisodeId(String profile, Long episodeId);

    @Query("select p from WatchProgress p join fetch p.episode where p.profile = :profile")
    List<WatchProgress> findAllByProfile(@Param("profile") String profile);

    @Query("select p from WatchProgress p join fetch p.episode e join fetch e.series where p.profile = :profile and e.series.id = :seriesId")
    List<WatchProgress> findBySeries(@Param("profile") String profile, @Param("seriesId") Long seriesId);

    /** Ultimo episodio tocado de cada serie, mais recente primeiro (fila "Continuar assistindo"). */
    @Query("""
            select p from WatchProgress p join fetch p.episode e join fetch e.series s
            where p.profile = :profile
              and p.updatedAt = (select max(p2.updatedAt) from WatchProgress p2 join p2.episode e2
                                 where p2.profile = :profile and e2.series = s)
            order by p.updatedAt desc
            """)
    List<WatchProgress> findContinueWatching(@Param("profile") String profile);
}
