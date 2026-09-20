package com.dramahub.seed;

import com.dramahub.model.Episode;
import com.dramahub.model.Series;
import com.dramahub.repo.SeriesRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Popula o catalogo com os "open movies" da Blender Foundation (licenca Creative Commons BY),
 * hospedados no Internet Archive. Cada filme e dividido em episodios curtos via startSec/endSec,
 * simulando o formato de short drama. Roda so quando o banco esta vazio.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String IA = "https://archive.org/download/";

    private final SeriesRepository seriesRepo;

    public DataSeeder(SeriesRepository seriesRepo) {
        this.seriesRepo = seriesRepo;
    }

    @Override
    public void run(String... args) {
        if (seriesRepo.count() > 0) {
            return;
        }
        log.info("Banco vazio - carregando catalogo de exemplo (Creative Commons)");

        // ---------- Sintel ----------
        Series sintel = series("A Garota e o Dragão",
                "Sintel percorre um mundo cruel em busca de Scales, o filhote de dragão que ela salvou e que foi arrancado dela. "
                        + "Cada passo a aproxima de uma verdade que vai partir seu coração.",
                IA + "Sintel/Poster.jpg", "Fantasia", "fantasia,dragão,aventura,drama", true,
                "Sintel © Blender Foundation | durian.blender.org - CC BY 3.0");
        String sintelVideo = IA + "Sintel/sintel-2048-stereo_512kb.mp4";
        String sintelThumb = IA + "Sintel/Sintel.thumbs/sintel-2048-stereo_%06d.jpg";
        episode(sintel, 1, "A Estranha na Cidade", sintelVideo, 0, 180, sintelThumb.formatted(1));
        episode(sintel, 2, "Scales", sintelVideo, 180, 360, sintelThumb.formatted(180));
        episode(sintel, 3, "O Roubo", sintelVideo, 360, 540, sintelThumb.formatted(360));
        episode(sintel, 4, "A Caverna", sintelVideo, 540, 720, sintelThumb.formatted(540));
        episode(sintel, 5, "O Reencontro", sintelVideo, 720, 888, sintelThumb.formatted(720));

        // ---------- Tears of Steel ----------
        Series tos = series("Lágrimas de Aço",
                "Amsterdã, 2052. Um grupo de cientistas tenta reescrever o passado para salvar o futuro - e Thom precisa "
                        + "reviver o dia em que perdeu Celia para o robô que ela escolheu no lugar dele.",
                IA + "Tears-of-Steel/Tears-of-Steel.thumbs/tears_of_steel_720p_000027.jpg", "Sci-Fi",
                "sci-fi,romance,robôs,futuro", true,
                "Tears of Steel © Blender Foundation | mango.blender.org - CC BY 3.0");
        String tosVideo = IA + "Tears-of-Steel/tears_of_steel_720p.mp4";
        String tosThumb = IA + "Tears-of-Steel/Tears-of-Steel.thumbs/tears_of_steel_720p_%06d.jpg";
        episode(tos, 1, "O Término", tosVideo, 0, 180, tosThumb.formatted(1));
        episode(tos, 2, "Quarenta Anos Depois", tosVideo, 180, 360, tosThumb.formatted(177));
        episode(tos, 3, "A Simulação", tosVideo, 360, 540, tosThumb.formatted(357));
        episode(tos, 4, "Ela Voltou", tosVideo, 540, 734, tosThumb.formatted(537));

        // ---------- Big Buck Bunny ----------
        Series bbb = series("O Coelho Que Não Perdoa",
                "Um coelho gigante e gentil só queria aproveitar a manhã. Mas três roedores cruéis passaram do limite - "
                        + "e agora ele vai armar a vingança perfeita.",
                "https://peach.blender.org/wp-content/uploads/poster_bunny_bunnysize.jpg", "Comédia",
                "comédia,vingança,animação", false,
                "Big Buck Bunny © Blender Foundation | peach.blender.org - CC BY 3.0");
        String bbbVideo = IA + "BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4";
        String bbbThumb = IA + "BigBuckBunny_124/BigBuckBunny_124.thumbs/Content/big_buck_bunny_720p_surround_%06d.jpg";
        episode(bbb, 1, "Uma Manhã Perfeita", bbbVideo, 0, 150, bbbThumb.formatted(1));
        episode(bbb, 2, "Os Valentões", bbbVideo, 150, 300, bbbThumb.formatted(165));
        episode(bbb, 3, "O Plano", bbbVideo, 300, 450, bbbThumb.formatted(315));
        episode(bbb, 4, "A Vingança", bbbVideo, 450, 596, bbbThumb.formatted(465));

        // ---------- Elephants Dream ----------
        Series ed = series("O Sonho dos Elefantes",
                "Proog guia o jovem Emo por uma máquina infinita e perigosa. Mas quanto mais Emo vê, menos acredita - "
                        + "e a confiança entre os dois começa a rachar.",
                IA + "ElephantsDream/ElephantsDream.thumbs/ed_1024_000210.jpg", "Suspense",
                "suspense,mistério,surreal", false,
                "Elephants Dream © Blender Foundation | orange.blender.org - CC BY 2.5");
        String edVideo = IA + "ElephantsDream/ed_hd_512kb.mp4";
        String edThumb = IA + "ElephantsDream/ElephantsDream.thumbs/ed_1024_%06d.jpg";
        episode(ed, 1, "A Máquina", edVideo, 0, 165, edThumb.formatted(1));
        episode(ed, 2, "Os Pássaros", edVideo, 165, 330, edThumb.formatted(150));
        episode(ed, 3, "A Dúvida", edVideo, 330, 495, edThumb.formatted(330));
        episode(ed, 4, "O Fim do Sonho", edVideo, 495, 654, edThumb.formatted(480));

        seriesRepo.saveAll(java.util.List.of(sintel, tos, bbb, ed));
        log.info("Catalogo de exemplo carregado: 4 series");
    }

    private static Series series(String title, String synopsis, String cover, String genre, String tags,
                                 boolean featured, String credit) {
        Series s = new Series();
        s.setTitle(title);
        s.setSynopsis(synopsis);
        s.setCoverUrl(cover);
        s.setGenre(genre);
        s.setTags(tags);
        s.setSource("cc");
        s.setCredit(credit);
        s.setFeatured(featured);
        return s;
    }

    private static void episode(Series s, int number, String title, String videoUrl, double start, double end,
                                String thumb) {
        Episode e = new Episode();
        e.setNumber(number);
        e.setTitle(title);
        e.setVideoUrl(videoUrl);
        e.setStartSec(start);
        e.setEndSec(end);
        e.setDurationSec((int) (end - start));
        e.setThumbnailUrl(thumb);
        s.addEpisode(e);
    }
}
