package com.dramahub.repo;

import com.dramahub.model.Series;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SeriesRepository extends JpaRepository<Series, Long> {

    @EntityGraph(attributePaths = "episodes")
    Optional<Series> findWithEpisodesById(Long id);

    @Query("""
            select s from Series s
            where (:genre is null or lower(s.genre) = lower(:genre))
              and (:source is null or s.source = :source)
              and (:q is null or lower(s.title) like lower(concat('%', :q, '%'))
                             or lower(s.tags) like lower(concat('%', :q, '%')))
            order by s.featured desc, s.createdAt desc
            """)
    List<Series> search(@Param("genre") String genre, @Param("source") String source, @Param("q") String q);

    @Query("select e.youtubeId from Episode e where e.youtubeId is not null")
    List<String> findAllYoutubeIds();

    @Query("select distinct s.genre from Series s where s.genre is not null order by s.genre")
    List<String> findAllGenres();
}
