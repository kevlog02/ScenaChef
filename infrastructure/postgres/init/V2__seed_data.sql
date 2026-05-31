-- Seed Users
-- admin / admin123
-- cajero1 / secret
-- cocina1 / secret
INSERT INTO users (name, username, password, role) VALUES
  ('Administrador', 'admin', '$2b$12$yMis6azcZadNEnZqSgwIAOTxAuRpVRpjfWfYKkl8U3p4vEQJUAf3K', 'ADMIN'),
  ('Cajero Uno',   'cajero1', '$2b$12$/IUJLIp.8fyoVrCLMzltbetOYJPzmmtKw4CThzkwWTlpynXucw0NS', 'CAJERO'),
  ('Cocinero Uno', 'cocina1', '$2b$12$/IUJLIp.8fyoVrCLMzltbetOYJPzmmtKw4CThzkwWTlpynXucw0NS', 'COCINERO');

-- Seed Products
INSERT INTO products (name, description, price, category) VALUES
  ('Hamburguesa Clásica', 'Con queso, lechuga y tomate', 120.00, 'Comida'),
  ('Hamburguesa Especial', 'Doble carne y tocino', 150.00, 'Comida'),
  ('Papas Fritas', 'Porción grande', 50.00, 'Acompañamientos'),
  ('Refresco', 'Lata 355ml', 30.00, 'Bebidas'),
  ('Agua',    'Botella 600ml', 20.00, 'Bebidas');
