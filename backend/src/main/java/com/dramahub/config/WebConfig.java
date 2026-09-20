package com.dramahub.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.server.MimeMappings;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.server.servlet.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(DramaHubProperties.class)
public class WebConfig implements WebMvcConfigurer {

    private final DramaHubProperties props;

    public WebConfig(DramaHubProperties props) {
        this.props = props;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(props.allowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Content-Range", "Accept-Ranges");
    }

    /** MIME do manifest do PWA (o Tomcat nao conhece .webmanifest). */
    @Bean
    public WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> mimeMappings() {
        return factory -> {
            MimeMappings m = new MimeMappings(MimeMappings.DEFAULT);
            m.add("webmanifest", "application/manifest+json");
            factory.setMimeMappings(m);
        };
    }
}
