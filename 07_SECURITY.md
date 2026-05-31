# Requerimientos: Seguridad

## Componentes de Seguridad

| Componente | Mecanismo |
|------------|-----------|
| Autenticación | JWT (JSON Web Token) |
| Autorización | Roles basados en Spring Security |
| Transporte | HTTPS con TLS/SSL |
| Contraseñas | BCrypt |
| CORS | Configurado en Spring Boot y Express |

---

## JWT

### Estructura del Token

```
Header.Payload.Signature
```

**Payload:**
```json
{
  "sub": "cajero1",
  "role": "CAJERO",
  "userId": 2,
  "iat": 1705330200,
  "exp": 1705416600
}
```

### Configuración

- **Algoritmo:** HS256
- **Expiración:** 24 horas (`86400000` ms)
- **Secret:** Variable de entorno `JWT_SECRET` (mínimo 32 caracteres)

### Flujo de Autenticación

```
1. POST /api/auth/login { username, password }
2. Spring Security verifica credenciales contra BD
3. Si válido: generar JWT y retornar
4. Cliente guarda JWT (memoria o sessionStorage)
5. Cada request: Header "Authorization: Bearer <token>"
6. JwtFilter extrae y valida el token
7. Si válido: setear SecurityContext con usuario y rol
```

---

## Roles y Permisos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `ADMIN` | Administrador del sistema | Todo: usuarios, productos, pedidos |
| `CAJERO` | Cajero | Ver productos, crear y gestionar pedidos |
| `COCINERO` | Personal de cocina | Panel de cocina, actualizar estados |

### Matriz de Acceso por Endpoint

| Endpoint | ADMIN | CAJERO | COCINERO |
|----------|-------|--------|---------|
| POST /api/auth/login | ✓ | ✓ | ✓ |
| GET /api/users | ✓ | — | — |
| POST /api/users | ✓ | — | — |
| PUT /api/users/{id} | ✓ | — | — |
| DELETE /api/users/{id} | ✓ | — | — |
| GET /api/products | ✓ | ✓ | — |
| POST /api/products | ✓ | — | — |
| PUT /api/products/{id} | ✓ | — | — |
| DELETE /api/products/{id} | ✓ | — | — |
| GET /api/orders | ✓ | ✓ | — |
| POST /api/orders | ✓ | ✓ | — |
| PATCH /api/orders/{id}/status | ✓ | ✓ | — |
| GET /api/kitchen/orders | — | — | ✓ |
| PATCH /api/kitchen/orders/{id}/status | — | — | ✓ |

---

## Implementación Spring Security

### `SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers("/api/users/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/products/**").hasAnyRole("ADMIN", "CAJERO")
                .requestMatchers(HttpMethod.POST, "/api/products/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/products/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasRole("ADMIN")
                .requestMatchers("/api/orders/**").hasAnyRole("ADMIN", "CAJERO")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

### `JwtAuthFilter.java`

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        // 1. Validar token (firma + expiración)
        // 2. Extraer username y role
        // 3. Cargar usuario desde UserDetailsService
        // 4. Crear UsernamePasswordAuthenticationToken
        // 5. Setear en SecurityContextHolder
        filterChain.doFilter(request, response);
    }
}
```

### `JwtUtil.java`

```java
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    public String generateToken(UserDetails userDetails, String role) {
        return Jwts.builder()
            .setSubject(userDetails.getUsername())
            .claim("role", role)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public String extractUsername(String token) { ... }
    private boolean isTokenExpired(String token) { ... }
    private SecretKey getSigningKey() { ... }
}
```

---

## HTTPS / TLS

### Generación de Keystore (desarrollo)

```bash
keytool -genkeypair \
  -alias restaurant \
  -keyalg RSA \
  -keysize 2048 \
  -storetype PKCS12 \
  -keystore keystore.p12 \
  -validity 365 \
  -storepass changeit
```

### `application.properties`

```properties
server.ssl.enabled=true
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=${SSL_KEY_PASSWORD}
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=restaurant
```

> En producción usar certificado firmado (Let's Encrypt o CA corporativa).

---

## BCrypt — Contraseñas

- **Fuerza:** 12 rounds
- **Implementación:** `BCryptPasswordEncoder(12)` de Spring Security
- Las contraseñas **nunca** se almacenan en texto plano
- Al verificar login: `passwordEncoder.matches(rawPassword, encodedPassword)`

---

## Variables de Entorno Sensibles

Nunca hardcodear en código. Usar variables de entorno en Docker Compose:

```yaml
environment:
  - JWT_SECRET=tu_secreto_muy_largo_y_aleatorio_de_al_menos_32_chars
  - DB_USERNAME=restaurant_user
  - DB_PASSWORD=tu_password_seguro
  - SSL_KEY_PASSWORD=changeit
```
