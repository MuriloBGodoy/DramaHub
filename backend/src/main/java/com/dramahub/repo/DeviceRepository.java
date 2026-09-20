package com.dramahub.repo;

import com.dramahub.model.Device;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    @EntityGraph(attributePaths = "user")
    Optional<Device> findByTokenHash(String tokenHash);

    List<Device> findByUserIdOrderByLastSeenAtDesc(Long userId);

    Optional<Device> findByIdAndUserId(Long id, Long userId);
}
