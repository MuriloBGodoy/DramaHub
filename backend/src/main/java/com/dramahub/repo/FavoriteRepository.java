package com.dramahub.repo;

import com.dramahub.model.Favorite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    @EntityGraph(attributePaths = "series")
    List<Favorite> findByProfileOrderByCreatedAtDesc(String profile);

    Optional<Favorite> findByProfileAndSeriesId(String profile, Long seriesId);

    boolean existsByProfileAndSeriesId(String profile, Long seriesId);

    @EntityGraph(attributePaths = "series")
    List<Favorite> findAllByProfile(String profile);
}
