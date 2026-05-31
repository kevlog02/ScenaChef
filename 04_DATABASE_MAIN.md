# Requerimientos: Base de Datos Principal (PostgreSQL)

## Tecnología
- **Motor:** PostgreSQL 15+
- **ORM:** Hibernate (vía Spring Data JPA)
- **Gestión de migraciones:** Flyway o Liquibase (recomendado) / `ddl-auto: validate` en producción

---

## Esquema de Base de Datos

### Tabla: `users`

```sql
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100)        NOT NULL,
    username   VARCHAR(50)         NOT NULL UNIQUE,
    password   VARCHAR(255)        NOT NULL,  -- bcrypt hash
    role       VARCHAR(20)         NOT NULL CHECK (role IN ('ADMIN', 'CAJERO', 'COCINERO')),
    active     BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

---

### Tabla: `products`

```sql
CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150)        NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2)      NOT NULL CHECK (price > 0),
    category    VARCHAR(100)        NOT NULL,
    available   BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_available ON products(available);
CREATE INDEX idx_products_category ON products(category);
```

---

### Tabla: `orders`

```sql
CREATE TABLE orders (
    id           BIGSERIAL PRIMARY KEY,
    table_number INTEGER             NOT NULL CHECK (table_number > 0),
    status       VARCHAR(20)         NOT NULL CHECK (status IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO')),
    created_by   BIGINT              REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table_number ON orders(table_number);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

---

### Tabla: `order_items`

```sql
CREATE TABLE order_items (
    id         BIGSERIAL PRIMARY KEY,
    order_id   BIGINT          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity   INTEGER         NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2)  NOT NULL CHECK (unit_price > 0)
    -- unit_price = precio del producto al momento del pedido (snapshot)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

---

## Script de Inicialización Completo

```sql
-- V1__init_schema.sql (Flyway)

CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,
    username   VARCHAR(50)   NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,
    role       VARCHAR(20)   NOT NULL CHECK (role IN ('ADMIN', 'CAJERO', 'COCINERO')),
    active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150)   NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    category    VARCHAR(100)   NOT NULL,
    available   BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE orders (
    id           BIGSERIAL PRIMARY KEY,
    table_number INTEGER        NOT NULL CHECK (table_number > 0),
    status       VARCHAR(20)    NOT NULL CHECK (status IN ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO')),
    created_by   BIGINT         REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
    id         BIGSERIAL PRIMARY KEY,
    order_id   BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT         NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity   INTEGER        NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0)
);

-- Índices
CREATE INDEX idx_users_username    ON users(username);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_products_avail    ON products(available);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_table      ON orders(table_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

---

## Datos Iniciales (Seed)

```sql
-- V2__seed_data.sql

-- Usuario admin por defecto
-- password: "admin123" (bcrypt $2a$12$...)
INSERT INTO users (name, username, password, role) VALUES
  ('Administrador', 'admin', '$2a$12$HASH_BCRYPT_AQUI', 'ADMIN'),
  ('Cajero Uno',   'cajero1', '$2a$12$HASH_BCRYPT_AQUI', 'CAJERO'),
  ('Cocinero Uno', 'cocina1', '$2a$12$HASH_BCRYPT_AQUI', 'COCINERO');

-- Productos de ejemplo
INSERT INTO products (name, description, price, category) VALUES
  ('Hamburguesa Clásica', 'Con queso, lechuga y tomate', 120.00, 'Comida'),
  ('Hamburguesa Especial', 'Doble carne y tocino', 150.00, 'Comida'),
  ('Papas Fritas', 'Porción grande', 50.00, 'Acompañamientos'),
  ('Refresco', 'Lata 355ml', 30.00, 'Bebidas'),
  ('Agua',    'Botella 600ml', 20.00, 'Bebidas');
```

---

## Replicación (Requisito Académico)

El sistema debe configurar **replicación de streaming de PostgreSQL** como procesamiento de datos redundante.

### Configuración `postgresql.conf` (Primary)
```
wal_level = replica
max_wal_senders = 2
wal_keep_size = 64MB
```

### Configuración `pg_hba.conf` (Primary)
```
host replication replicator 0.0.0.0/0 md5
```

### Réplica (Standby)
```bash
# En el contenedor réplica:
pg_basebackup -h postgres-primary -U replicator -D /var/lib/postgresql/data -Fp -Xs -P -R
```

En Docker Compose, incluir dos servicios:
- `postgres-primary` (lectura/escritura)
- `postgres-replica` (solo lectura, standby)

---

## Trigger para `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```
