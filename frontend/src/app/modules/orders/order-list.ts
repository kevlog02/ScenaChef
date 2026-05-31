import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/models';
import { OrderFormComponent } from './order-form';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, OrderFormComponent],
  templateUrl: './order-list.html'
})
export class OrderListComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);

  orders = signal<Order[]>([]);
  showForm = signal(false);
  private eventsSource?: EventSource;

  ngOnInit(): void {
    this.loadOrders();
    this.connectToOrderEvents();
  }

  ngOnDestroy(): void {
    this.eventsSource?.close();
  }

  loadOrders(): void {
    this.orderService.getAll().subscribe({
      next: (data: Order[]) => this.orders.set(data.sort((a: Order, b: Order) => (b.id || 0) - (a.id || 0))),
      error: (err: unknown) => console.error('Error al cargar pedidos:', err)
    });
  }

  openCreateForm(): void {
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onFormSaved(): void {
    this.closeForm();
    this.loadOrders();
  }

  getOrderTotal(order: Order): number {
    return order.items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  }

  entregarPedido(order: Order): void {
    if (!order.id) return;
    this.orderService.updateStatus(order.id, 'ENTREGADO').subscribe({
      next: () => this.loadOrders(),
      error: (err: any) => alert(err.message || 'Error al actualizar estado')
    });
  }

  private connectToOrderEvents(): void {
    this.eventsSource = new EventSource(`${environment.apiUrl}/orders/events`);

    this.eventsSource.addEventListener('orders-changed', () => {
      this.loadOrders();
    });

    this.eventsSource.onerror = (error) => {
      console.error('SSE pedidos desconectado/reintentando:', error);
    };
  }
}
