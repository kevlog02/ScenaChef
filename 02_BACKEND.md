# Requerimientos: Backend Principal (Spring Boot)

## Tecnología
- **Lenguaje:** Java 17+
- **Framework:** Spring Boot 3.x
- **Módulos Spring:** Spring MVC, Spring Security, Spring Data JPA
- **ORM:** Hibernate (a través de Spring Data JPA)
- **Base de datos:** PostgreSQL
- **Mensajería:** MQTT Client (Eclipse Paho)
- **Autenticación:** JWT (jjwt o java-jwt)
- **Build:** Maven o Gradle

---

## Dependencias Principales (pom.xml / build.gradle)

```xml
<!-- Spring Boot Starters -->
spring-boot-starter-web
spring-boot-starter-security
spring-boot-starter-data-jpa
spring-boot-starter-validation

<!-- Database -->
postgresql (driver)
hibernate-core (incluido en JPA)

<!-- JWT -->
io.jsonwebtoken:jjwt-api
io.jsonwebtoken:jjwt-impl
io.jsonwebtoken:jjwt-jackson

<!-- MQTT -->
org.eclipse.paho:org.eclipse.paho.client.mqttv3

<!-- Utils -->
lombok
```

---

## Configuración `application.properties`

```properties
# Server
server.port=8080
server.ssl.enabled=true
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=${SSL_KEY_PASSWORD}
server.ssl.key-store-type=PKCS12

# Database
spring.datasource.url=jdbc:postgresql://postgres:5432/restaurant_db
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=false

# JWT
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000

# MQTT
mqtt.broker.url=tcp://mosquitto:1883
mqtt.client.id=spring-boot-client
mqtt.topic.order.created=restaurant/orders/created
mqtt.topic.order.status.updated=restaurant/orders/status
```

---

## Entidades JPA

### `User`
```java
@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password; // bcrypt

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role; // ADMIN, CAJERO, COCINERO

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
```

### `Product`
```java
@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private boolean available = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
```

### `Order`
```java
@Entity
@Table(name = "orders")
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "table_number", nullable = false)
    private Integer tableNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status; // PENDIENTE, EN_PREPARACION, LISTO, ENTREGADO

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<OrderItem> items;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

### `OrderItem`
```java
@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice; // precio al momento del pedido
}
```

---

## Repositorios (Spring Data JPA)

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    List<User> findByActive(boolean active);
}

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByAvailable(boolean available);
    List<Product> findByCategory(String category);
}

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(OrderStatus status);
    List<Order> findByTableNumber(Integer tableNumber);
    List<Order> findByStatusIn(List<OrderStatus> statuses);
}
```

---

## API REST — Endpoints

### Auth Controller — `/api/auth`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login, retorna JWT | No |

**Request Body:**
```json
{ "username": "cajero1", "password": "secret" }
```

**Response:**
```json
{ "token": "eyJ...", "role": "CAJERO", "username": "cajero1" }
```

---

### Users Controller — `/api/users`

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/users` | Listar todos | ADMIN |
| GET | `/api/users/{id}` | Obtener por ID | ADMIN |
| POST | `/api/users` | Crear usuario | ADMIN |
| PUT | `/api/users/{id}` | Actualizar usuario | ADMIN |
| DELETE | `/api/users/{id}` | Eliminar usuario | ADMIN |

---

### Products Controller — `/api/products`

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/products` | Listar todos | ADMIN, CAJERO |
| GET | `/api/products/available` | Solo disponibles | ADMIN, CAJERO |
| GET | `/api/products/{id}` | Obtener por ID | ADMIN, CAJERO |
| POST | `/api/products` | Crear producto | ADMIN |
| PUT | `/api/products/{id}` | Actualizar | ADMIN |
| DELETE | `/api/products/{id}` | Eliminar | ADMIN |

---

### Orders Controller — `/api/orders`

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/orders` | Listar todos | CAJERO, ADMIN |
| GET | `/api/orders/{id}` | Obtener por ID | CAJERO, ADMIN |
| POST | `/api/orders` | Crear pedido | CAJERO |
| PATCH | `/api/orders/{id}/status` | Actualizar estado | CAJERO |

**Request crear pedido:**
```json
{
  "tableNumber": 5,
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 3, "quantity": 1 }
  ]
}
```

**Request actualizar estado:**
```json
{ "status": "ENTREGADO" }
```

---

## Lógica de Negocio — Servicios

### `OrderService`

Al crear un pedido:
1. Validar que todos los `productId` existan y estén disponibles
2. Guardar el pedido en PostgreSQL con estado `PENDIENTE`
3. Publicar evento MQTT en el topic `restaurant/orders/created` con payload:
```json
{
  "orderId": 101,
  "tableNumber": 5,
  "items": [
    { "productId": 1, "productName": "Hamburguesa", "quantity": 2 },
    { "productId": 3, "productName": "Refresco", "quantity": 1 }
  ],
  "status": "PENDIENTE",
  "createdAt": "2024-01-15T14:30:00"
}
```

Al recibir evento MQTT de actualización de estado desde el microservicio de cocina:
1. Suscribirse al topic `restaurant/orders/status`
2. Actualizar el estado del pedido en PostgreSQL

---

## Seguridad

### Spring Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    // - Deshabilitar CSRF (API stateless)
    // - Permitir sin auth: POST /api/auth/login
    // - Requerir auth para todo lo demás
    // - Agregar JwtAuthenticationFilter antes de UsernamePasswordAuthenticationFilter
    // - CORS habilitado para http://localhost:4200
}
```

### JWT Filter

- Extraer token del header `Authorization: Bearer <token>`
- Validar firma y expiración
- Cargar usuario desde base de datos
- Setear `SecurityContextHolder`

### Password Encoding

- Usar `BCryptPasswordEncoder` para hashear contraseñas

---

## MQTT Service

```java
@Service
public class MqttService {
    // Al iniciar: conectar a Mosquitto, suscribirse a restaurant/orders/status
    void publishOrderCreated(OrderCreatedEvent event);
    void onOrderStatusReceived(String payload); // callback del broker
}
```

---

## Manejo de Errores

Implementar `@ControllerAdvice` global que retorne:
```json
{
  "timestamp": "2024-01-15T14:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "El producto con id 5 no está disponible"
}
```

Mapear:
- `EntityNotFoundException` → 404
- `ValidationException` → 400
- `BadCredentialsException` → 401
- `AccessDeniedException` → 403
- `Exception` genérica → 500

---

## Estructura de Paquetes Sugerida

```
com.restaurant
├── config/
│   ├── SecurityConfig.java
│   └── MqttConfig.java
├── controller/
│   ├── AuthController.java
│   ├── UserController.java
│   ├── ProductController.java
│   └── OrderController.java
├── service/
│   ├── AuthService.java
│   ├── UserService.java
│   ├── ProductService.java
│   ├── OrderService.java
│   └── MqttService.java
├── repository/
│   ├── UserRepository.java
│   ├── ProductRepository.java
│   └── OrderRepository.java
├── entity/
│   ├── User.java
│   ├── Product.java
│   ├── Order.java
│   └── OrderItem.java
├── dto/
│   ├── request/
│   └── response/
├── security/
│   ├── JwtFilter.java
│   └── JwtUtil.java
├── enums/
│   ├── Role.java
│   └── OrderStatus.java
└── exception/
    └── GlobalExceptionHandler.java
```
