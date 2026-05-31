-- Create Replication User
CREATE ROLE replicator WITH REPLICATION PASSWORD 'replicator_password' LOGIN;

-- Tables
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

-- Indices
CREATE INDEX idx_users_username    ON users(username);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_products_avail    ON products(available);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_table      ON orders(table_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Trigger for updated_at
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
