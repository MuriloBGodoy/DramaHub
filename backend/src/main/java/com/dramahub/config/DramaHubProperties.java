package com.dramahub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "dramahub")
/** adminCode: se definido, alterar o catalogo (Estudio) exige esse codigo; vazio = liberado para qualquer sessao. */
public record DramaHubProperties(String mediaDir, List<String> allowedOrigins, String adminCode) {
}
