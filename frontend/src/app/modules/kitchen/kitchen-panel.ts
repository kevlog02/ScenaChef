import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenService } from '../../core/services/kitchen.service';
import { KitchenOrder } from '../../core/models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-kitchen-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-panel.html'
})
export class KitchenPanelComponent implements OnInit, OnDestroy {
  private readonly kitchenService = inject(KitchenService);

  activeOrders = signal<KitchenOrder[]>([]);
  private eventsSource?: EventSource;

  ngOnInit(): void {
    this.refreshActiveOrders();
    this.connectToKitchenEvents();
  }

  ngOnDestroy(): void {
    this.eventsSource?.close();
  }

  getMinutesElapsed(receivedAt: string): number {
    const receivedTime = new Date(receivedAt).getTime();
    const nowTime = new Date().getTime();
    const diffMs = nowTime - receivedTime;
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  changeStatus(order: KitchenOrder, nextStatus: string): void {
    this.kitchenService.updateOrderStatus(order.orderId, nextStatus).subscribe({
      next: () => this.refreshActiveOrders(),
      error: (err: any) => alert(err.message || 'Error al cambiar estado del pedido')
    });
  }

  private refreshActiveOrders(): void {
    this.kitchenService.getActiveOrders().subscribe({
      next: (data: KitchenOrder[]) => this.activeOrders.set(data),
      error: (err: unknown) => console.error('Error cargando pedidos activos:', err)
    });
  }

  private connectToKitchenEvents(): void {
    this.eventsSource = new EventSource(`${environment.kitchenApiUrl}/kitchen/events`);

    this.eventsSource.addEventListener('order-created', () => {
      this.refreshActiveOrders();
    });

    this.eventsSource.addEventListener('order-status-updated', () => {
      this.refreshActiveOrders();
    });

    this.eventsSource.onerror = (error) => {
      console.error('SSE cocina desconectado/reintentando:', error);
    };
  }
}
