package com.dramahub.web;

import com.dramahub.model.Device;
import com.dramahub.model.User;
import com.dramahub.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Regras de acesso da API:
 *  - GET /api/auth/status e POST /api/auth/session (cria a sessao anonima): publicos
 *  - todo o resto de /api: exige o token da sessao (Authorization: Bearer ... ou ?t=... para o <video>)
 *  - escrita no catalogo (POST/PUT/DELETE em /api/series, /api/episodes, /api/import, /api/ai): so admin
 *    (sessao liberada com ADMIN_CODE, ou qualquer sessao se ADMIN_CODE estiver vazio)
 * Fora de /api (frontend estatico) passa direto.
 */
@Component
public class AuthFilter extends OncePerRequestFilter {

    public static final String USER_ATTR = "dramahub.user";
    public static final String DEVICE_ATTR = "dramahub.device";

    private final AuthService auth;

    public AuthFilter(AuthService auth) {
        this.auth = auth;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String path = req.getRequestURI();
        boolean isPublic = path.equals("/api/auth/status") || (path.equals("/api/auth/session") && "POST".equals(req.getMethod()));
        if (!path.startsWith("/api/") || isPublic || "OPTIONS".equals(req.getMethod())) {
            chain.doFilter(req, res);
            return;
        }

        String token = null;
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) token = header.substring(7).trim();
        if (token == null) token = req.getParameter("t");

        Optional<Device> device = auth.authenticate(token);
        if (device.isEmpty()) {
            deny(res, 401, "Sessão expirada");
            return;
        }
        User user = device.get().getUser();
        auth.touch(device.get());

        boolean write = !"GET".equals(req.getMethod()) && !"HEAD".equals(req.getMethod());
        boolean catalog = path.startsWith("/api/series") || path.startsWith("/api/episodes") || path.startsWith("/api/import")
                || path.startsWith("/api/ai");
        if (write && catalog && !auth.isAdmin(user)) {
            deny(res, 403, "Só o administrador pode alterar o catálogo");
            return;
        }

        req.setAttribute(USER_ATTR, user);
        req.setAttribute(DEVICE_ATTR, device.get());
        chain.doFilter(req, res);
    }

    private static void deny(HttpServletResponse res, int status, String msg) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"error\":\"" + msg + "\"}");
    }
}
