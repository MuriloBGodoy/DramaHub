package com.dramahub.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Roteirista IA: a partir de uma premissa, gera titulo, sinopse, personagens e os episodios de um
 * short drama, com roteiro (dialogos) e prompts em ingles prontos para geradores de video
 * (Kling, Veo, Sora, Runway). Usa a API da Anthropic (ANTHROPIC_API_KEY).
 */
@Service
public class ScriptService {

    private static final Logger log = LoggerFactory.getLogger(ScriptService.class);
    private static final String MODEL = "claude-opus-5";

    private static final String SYSTEM = """
            Você é roteirista-chefe de um estúdio de short dramas verticais (estilo DramaBox/ReelShort) \
            produzidos inteiramente com ferramentas de geração de vídeo por IA. Escreve em português do Brasil, \
            com ganchos fortes no fim de cada episódio, reviravoltas e diálogos curtos e intensos. Episódios têm \
            1 a 3 minutos, formato vertical 9:16, e cada um é composto por 3 a 6 cenas curtas (5 a 10 segundos cada), \
            porque os geradores de vídeo por IA produzem clipes curtos.

            Responda SOMENTE com um JSON válido (sem markdown, sem comentários) exatamente neste formato:
            {
              "title": "título curto e chamativo",
              "logline": "uma frase de venda",
              "synopsis": "sinopse de 3 a 5 frases",
              "genre": "gênero principal",
              "tags": ["tag1", "tag2", "tag3"],
              "characters": [
                {"name": "Nome", "role": "protagonista/antagonista/...", "description": "quem é e o que quer, em 2 frases",
                 "visualPrompt": "descrição visual detalhada EM INGLÊS, consistente para reutilizar em todos os prompts (idade, rosto, cabelo, roupa característica)"}
              ],
              "episodes": [
                {"number": 1, "title": "título do episódio", "summary": "resumo em 2 frases",
                 "hook": "o gancho final do episódio",
                 "script": "roteiro com cabeçalhos de cena e diálogos, em português",
                 "scenes": [
                   {"description": "o que acontece, em português", "durationSec": 8,
                    "videoPrompt": "prompt EM INGLÊS para o gerador de vídeo: vertical 9:16, cinematic, descrição da ação, personagens (repita o visualPrompt do personagem), cenário, luz, câmera, emoção",
                    "dialogue": "fala(s) da cena em português, ou vazio"}
                 ]}
              ]
            }
            """;

    private final ObjectMapper mapper;
    private final AnthropicClient client;

    public ScriptService(ObjectMapper mapper) {
        this.mapper = mapper;
        String key = System.getenv("ANTHROPIC_API_KEY");
        this.client = key == null || key.isBlank() ? null : AnthropicOkHttpClient.builder().apiKey(key).build();
    }

    public boolean enabled() {
        return client != null;
    }

    public JsonNode generate(String premise, String genre, int episodes, String tone) {
        if (client == null) {
            throw new IllegalStateException("Roteirista IA desativado: defina a variável de ambiente ANTHROPIC_API_KEY e reinicie o servidor");
        }
        int n = Math.max(1, Math.min(12, episodes));
        String prompt = """
                Premissa: %s
                Gênero: %s
                Tom: %s
                Quantidade de episódios: %d

                Crie a série completa com exatamente %d episódios, seguindo o formato JSON pedido.
                """.formatted(premise.trim(), blank(genre) ? "Romance" : genre, blank(tone) ? "intenso e viciante" : tone, n, n);

        MessageCreateParams params = MessageCreateParams.builder()
                .model(MODEL)
                .maxTokens(16000L)
                .system(SYSTEM)
                .addUserMessage(prompt)
                .build();

        Message response;
        try {
            response = client.messages().create(params);
        } catch (AnthropicServiceException e) {
            log.warn("Anthropic API error: {}", e.getMessage());
            throw new IllegalStateException("A API da Anthropic recusou a chamada (" + e.statusCode() + "). Confira a chave e os créditos.");
        }

        String text = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(t -> t.text())
                .reduce("", String::concat)
                .trim();
        // tolera ```json ... ``` caso o modelo envolva a resposta
        if (text.startsWith("```")) {
            text = text.replaceAll("^```[a-zA-Z]*\\s*", "").replaceAll("\\s*```$", "");
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end < start) throw new IllegalStateException("O modelo não devolveu um roteiro válido. Tente de novo.");
        return mapper.readTree(text.substring(start, end + 1));
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
