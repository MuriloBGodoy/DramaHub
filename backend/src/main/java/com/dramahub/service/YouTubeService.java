package com.dramahub.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Le playlists e videos publicos do YouTube sem chave de API, a partir do JSON (ytInitialData)
 * embutido nas paginas. Usado para importar series dos canais oficiais das plataformas de drama.
 */
@Service
public class YouTubeService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeService.class);
    private static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
    private static final Pattern INITIAL_DATA = Pattern.compile("ytInitialData\\s*=\\s*(\\{.*?\\});\\s*</script>", Pattern.DOTALL);
    private static final Pattern PLAYER_RESPONSE = Pattern.compile("ytInitialPlayerResponse\\s*=\\s*(\\{.*?\\});\\s*(?:var|</script>)", Pattern.DOTALL);
    private static final Pattern API_KEY = Pattern.compile("\"INNERTUBE_API_KEY\":\"([^\"]+)\"");
    private static final Pattern CLIENT_VERSION = Pattern.compile("\"INNERTUBE_CLIENT_VERSION\":\"([^\"]+)\"");
    private static final Pattern VIDEO_ID = Pattern.compile("(?:v=|youtu\\.be/|/embed/|/shorts/|/live/)([A-Za-z0-9_-]{11})");
    private static final Pattern PLAYLIST_ID = Pattern.compile("[?&]list=([A-Za-z0-9_-]+)");
    private static final Pattern DURATION = Pattern.compile("^(?:(\\d+):)?(\\d{1,2}):(\\d{2})$");

    public record Video(String videoId, String title, Integer durationSec, boolean available, String thumbnailUrl) {
        Video withAvailable(boolean a) { return new Video(videoId, title, durationSec, a, thumbnailUrl); }
    }

    public record Preview(String kind, String id, String title, String channel, List<Video> videos) {}

    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper mapper;

    public YouTubeService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    // ---------- API publica ----------

    /** Le uma URL de playlist ou de video e devolve os videos (com checagem de disponibilidade). */
    public Preview preview(String url) {
        Matcher pl = PLAYLIST_ID.matcher(url);
        Matcher vid = VIDEO_ID.matcher(url);
        Preview p;
        if (pl.find() && !pl.group(1).startsWith("RD")) {
            p = playlist(pl.group(1));
        } else if (vid.find()) {
            p = singleVideo(vid.group(1));
        } else if (url.matches("[A-Za-z0-9_-]{11}")) {
            p = singleVideo(url);
        } else {
            throw new IllegalArgumentException("URL do YouTube nao reconhecida (use um link de playlist ou de video)");
        }
        return new Preview(p.kind(), p.id(), p.title(), p.channel(), checkAvailability(p.videos()));
    }

    // ---------- playlist ----------

    private Preview playlist(String playlistId) {
        String html = get("https://www.youtube.com/playlist?list=" + playlistId);
        JsonNode data = extract(html, INITIAL_DATA, "ytInitialData");
        String title = data.path("metadata").path("playlistMetadataRenderer").path("title").asText("");
        if (title.isBlank()) title = firstText(data.path("header"), "pageTitle");
        // Nome do canal: a parte de metadados que tem link (commandRuns) para o canal
        String channel = "";
        outer:
        for (JsonNode parts : findAll(data.path("header"), "metadataParts")) {
            for (JsonNode part : parts) {
                if (part.path("text").has("commandRuns")) { channel = text(part.path("text")); break outer; }
            }
        }
        if (channel.isBlank()) channel = firstText(data.path("sidebar"), "ownerText");

        List<Video> videos = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        collectVideos(data, videos, seen);

        // Paginacao (playlists com mais de 100 videos)
        String apiKey = find(html, API_KEY);
        String clientVersion = find(html, CLIENT_VERSION);
        String token = continuationToken(data);
        int guard = 0;
        while (token != null && apiKey != null && guard++ < 50) {
            JsonNode page = browseContinuation(apiKey, clientVersion, token);
            collectVideos(page, videos, seen);
            token = continuationToken(page);
        }
        if (videos.isEmpty()) {
            throw new IllegalArgumentException("Playlist vazia, privada ou nao encontrada: " + playlistId);
        }
        return new Preview("playlist", playlistId, title, channel, videos);
    }

    private JsonNode browseContinuation(String apiKey, String clientVersion, String token) {
        try {
            Map<String, Object> body = Map.of(
                    "context", Map.of("client", Map.of(
                            "clientName", "WEB",
                            "clientVersion", clientVersion == null ? "2.20240101.00.00" : clientVersion,
                            "hl", "pt", "gl", "BR")),
                    "continuation", token);
            HttpRequest req = HttpRequest.newBuilder(URI.create("https://www.youtube.com/youtubei/v1/browse?key=" + apiKey + "&prettyPrint=false"))
                    .header("User-Agent", UA)
                    .header("Content-Type", "application/json")
                    .header("Accept-Language", "pt-BR,pt;q=0.9")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .timeout(Duration.ofSeconds(30))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            return mapper.readTree(res.body());
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException("Falha ao paginar a playlist", e);
        }
    }

    private void collectVideos(JsonNode root, List<Video> out, Set<String> seen) {
        for (JsonNode r : findAll(root, "playlistVideoRenderer")) {
            String id = r.path("videoId").asText(null);
            if (id == null || !seen.add(id)) continue;
            Integer dur = r.hasNonNull("lengthSeconds") ? Integer.parseInt(r.path("lengthSeconds").asText()) : null;
            boolean playable = !r.has("isPlayable") || r.path("isPlayable").asBoolean(true);
            out.add(new Video(id, text(r.path("title")), dur, playable, thumb(id)));
        }
        for (JsonNode lv : findAll(root, "lockupViewModel")) {
            if (!"LOCKUP_CONTENT_TYPE_VIDEO".equals(lv.path("contentType").asText())) continue;
            String id = lv.path("contentId").asText(null);
            if (id == null || !seen.add(id)) continue;
            String title = lv.path("metadata").path("lockupMetadataViewModel").path("title").path("content").asText("");
            Integer dur = null;
            for (JsonNode badge : findAll(lv.path("contentImage"), "thumbnailBadgeViewModel")) {
                Integer d = parseDuration(badge.path("text").asText(""));
                if (d != null) { dur = d; break; }
            }
            out.add(new Video(id, title, dur, true, thumb(id)));
        }
    }

    /** Token de paginacao - layout antigo (continuationItemRenderer) e novo (continuationItemViewModel). */
    private String continuationToken(JsonNode root) {
        for (JsonNode c : findAll(root, "continuationCommand")) {
            String t = c.path("token").asText(null);
            if (t != null && !t.isBlank()) return t;
        }
        return null;
    }

    // ---------- video unico ----------

    private Preview singleVideo(String videoId) {
        String html = get("https://www.youtube.com/watch?v=" + videoId);
        JsonNode player = extract(html, PLAYER_RESPONSE, "ytInitialPlayerResponse");
        JsonNode details = player.path("videoDetails");
        String status = player.path("playabilityStatus").path("status").asText("");
        boolean ok = "OK".equals(status) && player.path("playabilityStatus").path("playableInEmbed").asBoolean(true);
        Integer dur = details.hasNonNull("lengthSeconds") ? Integer.parseInt(details.path("lengthSeconds").asText()) : null;
        Video v = new Video(videoId, details.path("title").asText(""), dur, ok, thumb(videoId));
        return new Preview("video", videoId, v.title(), details.path("author").asText(""), List.of(v));
    }

    // ---------- disponibilidade ----------

    /** Confirma cada video via oEmbed (rapido e leve): 200 = publico e disponivel. */
    private List<Video> checkAvailability(List<Video> videos) {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Future<Video>> futures = new ArrayList<>();
            for (Video v : videos) {
                futures.add(pool.submit(() -> v.available() ? v.withAvailable(oembedOk(v.videoId())) : v));
            }
            List<Video> result = new ArrayList<>();
            for (Future<Video> f : futures) {
                try { result.add(f.get(60, TimeUnit.SECONDS)); }
                catch (Exception e) { result.add(videos.get(result.size()).withAvailable(false)); }
            }
            return result;
        } finally {
            pool.shutdownNow();
        }
    }

    private boolean oembedOk(String videoId) {
        try {
            String u = "https://www.youtube.com/oembed?format=json&url=" +
                    URLEncoder.encode("https://www.youtube.com/watch?v=" + videoId, StandardCharsets.UTF_8);
            HttpRequest req = HttpRequest.newBuilder(URI.create(u)).header("User-Agent", UA).timeout(Duration.ofSeconds(20)).build();
            return http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode() == 200;
        } catch (IOException | InterruptedException e) {
            return false;
        }
    }

    // ---------- util ----------

    private String get(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .header("User-Agent", UA)
                    .header("Accept-Language", "pt-BR,pt;q=0.9")
                    .header("Cookie", "CONSENT=YES+1; SOCS=CAI")
                    .timeout(Duration.ofSeconds(30))
                    .GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) throw new IllegalArgumentException("YouTube respondeu " + res.statusCode() + " para " + url);
            return res.body();
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException("Falha ao acessar o YouTube", e);
        }
    }

    private JsonNode extract(String html, Pattern p, String name) {
        Matcher m = p.matcher(html);
        if (!m.find()) throw new IllegalArgumentException("Nao encontrei " + name + " na pagina (video/playlist inexistente ou pagina bloqueada)");
        return mapper.readTree(m.group(1));
    }

    private static String find(String html, Pattern p) {
        Matcher m = p.matcher(html);
        return m.find() ? m.group(1) : null;
    }

    /** Percorre a arvore e devolve todos os nos com a chave informada. */
    static List<JsonNode> findAll(JsonNode node, String key) {
        List<JsonNode> out = new ArrayList<>();
        walk(node, key, out);
        return out;
    }

    private static void walk(JsonNode node, String key, List<JsonNode> out) {
        if (node == null) return;
        if (node.isObject()) {
            JsonNode hit = node.get(key);
            if (hit != null) out.add(hit);
            node.properties().forEach(e -> walk(e.getValue(), key, out));
        } else if (node.isArray()) {
            node.forEach(c -> walk(c, key, out));
        }
    }

    private static String firstText(JsonNode node, String key) {
        for (JsonNode n : findAll(node, key)) {
            String t = text(n);
            if (!t.isBlank()) return t;
        }
        return "";
    }

    /** Texto de um no do YouTube: {simpleText} | {runs:[{text}]} | {content} | string */
    static String text(JsonNode n) {
        if (n == null || n.isMissingNode() || n.isNull()) return "";
        if (n.isTextual()) return n.asText();
        if (n.hasNonNull("simpleText")) return n.path("simpleText").asText();
        if (n.hasNonNull("content")) return n.path("content").asText();
        if (n.has("runs")) {
            StringBuilder sb = new StringBuilder();
            n.path("runs").forEach(r -> sb.append(r.path("text").asText("")));
            return sb.toString();
        }
        return "";
    }

    static Integer parseDuration(String s) {
        Matcher m = DURATION.matcher(s.trim());
        if (!m.matches()) return null;
        int h = m.group(1) == null ? 0 : Integer.parseInt(m.group(1));
        return h * 3600 + Integer.parseInt(m.group(2)) * 60 + Integer.parseInt(m.group(3));
    }

    public static String thumb(String videoId) {
        return "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg";
    }
}
