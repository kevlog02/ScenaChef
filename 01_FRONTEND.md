# Requerimientos: Frontend Angular

## Tecnología
- Framework: **Angular** (versión latest estable)
- Lenguaje: TypeScript
- Estilos: Angular Material o TailwindCSS
- Autenticación: JWT almacenado en memoria o HttpOnly cookie
- Comunicación: HTTP REST con el backend Spring Boot

---

## Módulos Requeridos

### 1. Módulo de Autenticación (`AuthModule`)

**Componentes:**
- `LoginComponent`: Formulario de inicio de sesión (usuario + contraseña)
- `AuthGuard`: Protección de rutas para usuarios autenticados
- `RoleGuard`: Protección de rutas por rol

**Servicios:**
- `AuthService`: 
  - `login(username, password): Observable<TokenResponse>`
  - `logout(): void`
  - `getToken(): string`
  - `isAuthenticated(): boolean`
  - `getUserRole(): string`

**Comportamiento:**
- Al iniciar sesión exitosamente, guardar JWT y redirigir según rol
- Interceptor HTTP que adjunta el token JWT en el header `Authorization: Bearer <token>` a todas las peticiones
- Al recibir 401, redirigir al login y limpiar sesión

---

### 2. Módulo de Gestión de Usuarios (`UsersModule`)

> Accesible solo para rol `ADMIN`

**Componentes:**
- `UserListComponent`: Tabla con listado de usuarios (id, nombre, username, rol, activo)
- `UserFormComponent`: Formulario para crear/editar usuario
- `UserDetailComponent`: Vista detalle de usuario

**Campos del formulario:**
- `name` (string, requerido)
- `username` (string, requerido, único)
- `password` (string, requerido al crear, opcional al editar)
- `role` (enum: ADMIN | CAJERO | COCINERO)
- `active` (boolean)

**Servicios:**
- `UserService`:
  - `getAll(): Observable<User[]>`
  - `getById(id): Observable<User>`
  - `create(user): Observable<User>`
  - `update(id, user): Observable<User>`
  - `delete(id): Observable<void>`

---

### 3. Módulo de Gestión de Productos (`ProductsModule`)

> Accesible para roles `ADMIN` y `CAJERO`

**Componentes:**
- `ProductListComponent`: Tabla con productos (id, nombre, precio, categoría, disponible)
- `ProductFormComponent`: Formulario para crear/editar producto
- `ProductDetailComponent`: Vista detalle

**Campos del formulario:**
- `name` (string, requerido)
- `description` (string, opcional)
- `price` (decimal, requerido, > 0)
- `category` (string, requerido)
- `available` (boolean)

**Servicios:**
- `ProductService`:
  - `getAll(): Observable<Product[]>`
  - `getAvailable(): Observable<Product[]>`
  - `getById(id): Observable<Product>`
  - `create(product): Observable<Product>`
  - `update(id, product): Observable<Product>`
  - `delete(id): Observable<void>`

---

### 4. Módulo de Gestión de Pedidos (`OrdersModule`)

> Accesible para rol `CAJERO`

**Componentes:**
- `OrderListComponent`: Listado de pedidos con estado actual
- `OrderFormComponent`: Formulario para crear pedido
  - Selector de número de mesa
  - Buscador/selector de productos disponibles
  - Agregar productos con cantidad
  - Resumen y total del pedido
- `OrderDetailComponent`: Detalle de pedido con historial de estado

**Estados posibles del pedido:**
```
PENDIENTE → EN_PREPARACION → LISTO → ENTREGADO
```

**Campos al crear pedido:**
- `tableNumber` (int, requerido)
- `items`: lista de `{ productId, quantity }`

**Servicios:**
- `OrderService`:
  - `getAll(): Observable<Order[]>`
  - `getById(id): Observable<Order>`
  - `create(order): Observable<Order>`
  - `updateStatus(id, status): Observable<Order>`

---

### 5. Panel de Cocina (`KitchenModule`)

> Accesible para rol `COCINERO`

**Componentes:**
- `KitchenPanelComponent`: Panel en tiempo real con tarjetas de pedidos pendientes/en preparación
- `OrderCardComponent`: Tarjeta individual de pedido con:
  - Número de pedido
  - Número de mesa
  - Lista de productos y cantidades
  - Estado actual
  - Botón para cambiar estado (PENDIENTE → EN_PREPARACION → LISTO)

**Comportamiento:**
- Polling cada 5 segundos al microservicio de cocina O WebSocket si se implementa
- Actualización de estado envía PATCH al microservicio Node.js
- Filtrar pedidos por estado: PENDIENTE y EN_PREPARACION solamente

**Servicios:**
- `KitchenService`:
  - `getActiveOrders(): Observable<KitchenOrder[]>`
  - `updateOrderStatus(id, status): Observable<KitchenOrder>`

---

## Routing

```typescript
const routes = [
  { path: 'login', component: LoginComponent },
  { path: '', canActivate: [AuthGuard], children: [
    { path: 'usuarios', component: UserListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN'] } },
    { path: 'productos', component: ProductListComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN', 'CAJERO'] } },
    { path: 'pedidos', component: OrderListComponent, canActivate: [RoleGuard], data: { roles: ['CAJERO'] } },
    { path: 'cocina', component: KitchenPanelComponent, canActivate: [RoleGuard], data: { roles: ['COCINERO'] } },
  ]},
  { path: '**', redirectTo: 'login' }
]
```

---

## Interceptores HTTP

### `JwtInterceptor`
- Adjunta `Authorization: Bearer <token>` en cada petición saliente

### `ErrorInterceptor`
- 401 → redirige a `/login`
- 403 → muestra mensaje de acceso denegado
- 500 → muestra mensaje de error genérico

---

## Variables de Entorno

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  kitchenApiUrl: 'http://localhost:3000/api'
}
```

---

## Estructura de Carpetas Sugerida

```
src/
├── app/
│   ├── core/
│   │   ├── interceptors/
│   │   ├── guards/
│   │   └── services/
│   ├── shared/
│   │   ├── components/
│   │   └── models/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── orders/
│   │   └── kitchen/
│   └── app-routing.module.ts
└── environments/
```
