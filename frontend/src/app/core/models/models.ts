export interface User {
  id?: number;
  name: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'CAJERO' | 'COCINERO';
  active: boolean;
  createdAt?: string;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  createdAt?: string;
}

export interface OrderItem {
  id?: number;
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id?: number;
  tableNumber: number;
  status: 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO';
  items: OrderItem[];
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface KitchenOrderItem {
  productId: number;
  productName: string;
  quantity: number;
}

export interface KitchenOrder {
  _id?: string;
  orderId: number;
  tableNumber: number;
  items: KitchenOrderItem[];
  status: 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO';
  receivedAt: string;
  updatedAt: string;
}

export interface TokenResponse {
  token: string;
  role: string;
  username: string;
}
