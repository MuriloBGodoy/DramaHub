package com.dramahub.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Fallback da SPA: rotas do React Router (ate 3 niveis, sem ponto no caminho, fora de /api e /h2)
 * devolvem o index.html do frontend (build do Vite copiado para resources/static).
 * Arquivos estaticos (com extensao) continuam passando pelo resource handler normal.
 */
@Controller
public class SpaController {

    private static final String SEG = "[^\\.]+";
    private static final String FIRST = "^(?!api$|h2$)[^\\.]+";

    @RequestMapping(value = {
            "/{a:" + FIRST + "}",
            "/{a:" + FIRST + "}/{b:" + SEG + "}",
            "/{a:" + FIRST + "}/{b:" + SEG + "}/{c:" + SEG + "}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
