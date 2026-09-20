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
import java.util.Set;

/**
 * Regras de acesso da API:
 *  - /api/auth/login, /api/auth/register: publicos
 *  - todo o resto de /api: exige token de dispositivo (Authorization: Bearer ... ou ?t=... para o <video>)
 *  - escrita no catalogo (POST/PUT/DELETE em /api/series, /api/episodes, /api/import): so ADMIN
 * Fora de /api (frontend estatico) passa direto.
 */
@Component
public class AuthFilter extends OncePerRequestFilter {

    public static final String USER_ATTR = "dramahub.user";
    private static final Set<String> PUBLIC = Set.of("/api/auth/login", "/api/auth/register", "/api/auth/status");

    private final AuthService auth;

    public AuthFilter(AuthService auth) {
        this.auth = auth;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String path = req.getRequestURI();
        if (!path.startsWith("/api/") || PUBLIC.contains(path) || "OPTIONS".equals(req.getMethod())) {
            chain.doFilter(req, res);
            return;
        }

        String token = null;
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) token = header.substring(7).trim();
        if (token == null) token = req.getParameter("t");

        Optional<Device> device = auth.authenticate(token);
        if (device.isEmpty()) {
            deny(res, 401, "Faça login para continuar");
            return;
        }
        User user = device.get().getUser();
        auth.touch(device.get());

        boolean write = !"GET".equals(req.getMethod()) && !"HEAD".equals(req.getMethod());
        boolean catalog = path.startsWith("/api/series") || path.startsWith("/api/episodes") || path.startsWith("/api/import")
                || path.startsWith("/api/ai");
        if (write && catalog && user.getRole() != User.Role.ADMIN) {
            deny(res, 403, "Só o administrador pode alterar o catálogo");
            return;
        }

        req.setAttribute(USER_ATTR, user);
        req.setAttribute("dramahub.device", device.get());
        chain.doFilter(req, res);
    }

    private static void deny(HttpServletResponse res, int status, String msg) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"error\":\"" + msg + "\"}");
    }
}
