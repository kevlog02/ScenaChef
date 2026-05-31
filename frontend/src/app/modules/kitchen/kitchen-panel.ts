import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenService } from '../../core/services/kitchen.service';
import { KitchenOrder } from '../../core/models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-kitchen-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Header Area -->
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight">Panel de Cocina</h1>
          <p class="text-sm text-gray-400">Monitoreo en tiempo real de los pedidos a preparar</p>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 bg-[#141822] border border-white/10 rounded-xl">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="text-xs text-gray-300 font-medium">Actualización en tiempo real</span>
        </div>
      </div>

      <!-- Pending / In Preparation Orders Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          *ngFor="let order of activeOrders()"
          [ngClass]="{
            'border-yellow-500/20 hover:border-yellow-500/35': order.status === 'PENDIENTE',
            'border-blue-500/20 hover:border-blue-500/35': order.status === 'EN_PREPARACION'
          }"
          class="bg-[#141822] border rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:shadow-2xl transition duration-300"
        >
          <!-- Card Header: Title / Time -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="block text-2xl font-black text-white">Mesa #{{ order.tableNumber }}</span>
                <span class="text-xs font-mono text-gray-400">Pedido #{{ order.orderId }}</span>
              </div>
              <span
                [ngClass]="{
                  'bg-yellow-500/10 text-yellow-500 border border-yellow-500/15': order.status === 'PENDIENTE',
                  'bg-blue-500/10 text-blue-500 border border-blue-500/15': order.status === 'EN_PREPARACION'
                }"
                class="px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide border"
              >
                {{ order.status === 'PENDIENTE' ? 'Pendiente' : 'En cocina' }}
              </span>
            </div>

            <!-- Elapsed Time since received -->
            <div class="text-xs text-gray-400 flex items-center gap-1.5 font-mono">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Recibido hace: {{ getMinutesElapsed(order.receivedAt) }} min</span>
            </div>

            <!-- Items -->
            <div class="space-y-2 border-t border-white/5 pt-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalle del Pedido</h4>
              <ul class="space-y-2">
                <li *ngFor="let item of order.items" class="flex items-center justify-between bg-[#1e2538]/30 p-2.5 rounded-xl border border-white/5">
                  <span class="text-sm font-medium text-gray-200">
                    {{ item.productName }}
                  </span>
                  <span class="px-2.5 py-0.5 bg-purple-600/15 border border-purple-500/20 text-purple-400 font-mono font-black text-xs rounded-lg">
                    x{{ item.quantity }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 pt-4 border-t border-white/5">
            <button
              *ngIf="order.status === 'PENDIENTE'"
              (click)="changeStatus(order, 'EN_PREPARACION')"
              class="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm rounded-xl transition duration-150 shadow-lg shadow-yellow-600/10"
            >
              Empezar Preparación
            </button>
            <button
              *ngIf="order.status === 'EN_PREPARACION'"
              (click)="changeStatus(order, 'LISTO')"
              class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition duration-150 shadow-lg shadow-blue-600/10"
            >
              Marcar como Listo
            </button>
          </div>
        </div>

        <div
          *ngIf="activeOrders().length === 0"
          class="col-span-full bg-[#141822] border border-white/10 border-dashed p-16 rounded-2xl text-center text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          No hay pedidos activos en cocina
        </div>
      </div>
    </div>
  `
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
      error: (err) => alert(err.message || 'Error al cambiar estado del pedido')
    });
  }

  private refreshActiveOrders(): void {
    this.kitchenService.getActiveOrders().subscribe({
      next: (data) => this.activeOrders.set(data),
      error: (err) => console.error('Error cargando pedidos activos:', err)
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
