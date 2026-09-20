package com.dramahub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "dramahub")
/** inviteCode: se definido, o cadastro exige esse codigo. */
public record DramaHubProperties(String mediaDir, List<String> allowedOrigins, String inviteCode) {
}
