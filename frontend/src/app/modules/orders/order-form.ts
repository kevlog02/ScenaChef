import { Component, OnInit, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/models';

interface SelectedItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col justify-between overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <h2 class="text-xl font-bold text-white">Crear Nuevo Pedido</h2>
        <button (click)="cancel()" class="text-gray-400 hover:text-white transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content (Dual Columns) -->
      <div class="flex-1 flex flex-col md:flex-row gap-6 mt-6 overflow-hidden min-h-[400px]">
        
        <!-- Left: Product Catalog Selection -->
        <div class="flex-1 flex flex-col min-h-0 bg-[#1b2131]/30 border border-white/5 rounded-2xl p-4 overflow-hidden">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 shrink-0">Menú de Platos</h3>
          
          <!-- Search input -->
          <div class="mb-4 shrink-0">
            <input
              type="text"
              name="search"
              [(ngModel)]="searchQuery"
              class="w-full px-4 py-2 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 outline-none text-sm text-white"
              placeholder="Buscar plato o bebida..."
            />
          </div>

          <!-- Product items list scrollable -->
          <div class="flex-1 overflow-y-auto space-y-2 pr-1">
            <div
              *ngFor="let product of filteredProducts()"
              class="p-3 bg-[#1e2538]/30 border border-white/5 rounded-xl flex items-center justify-between hover:bg-[#1e2538]/60 transition"
            >
              <div>
                <span class="block font-medium text-white text-sm">{{ product.name }}</span>
                <span class="block text-xs text-gray-400">{{ product.category }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="font-mono font-semibold text-purple-400 text-sm">\${{ product.price | number:'1.2-2' }}</span>
                <button
                  type="button"
                  (click)="addProductToOrder(product)"
                  class="px-3 py-1 bg-purple-600 hover:bg-purple-500 font-bold text-xs rounded-lg transition"
                >
                  Agregar +
                </button>
              </div>
            </div>
            <div *ngIf="filteredProducts().length === 0" class="text-center text-gray-500 text-sm py-8">
              No se encontraron productos disponibles
            </div>
          </div>
        </div>

        <!-- Right: Current Order Summary -->
        <div class="w-full md:w-80 flex flex-col justify-between bg-[#1b2131]/30 border border-white/5 rounded-2xl p-4">
          <div class="space-y-4 flex-1 flex flex-col min-h-0">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-400 shrink-0">Resumen del Pedido</h3>
            
            <!-- Table Number selector -->
            <div class="shrink-0">
              <label for="tableNumber" class="block text-xs text-gray-400 mb-1">Mesa</label>
              <input
                type="number"
                id="tableNumber"
                name="tableNumber"
                [(ngModel)]="tableNumber"
                required
                min="1"
                class="w-full px-4 py-2 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 outline-none text-sm text-white font-mono"
                placeholder="Número de mesa"
              />
            </div>

            <!-- Current items selected -->
            <div class="flex-1 overflow-y-auto space-y-3 min-h-[150px] pr-1 border-t border-white/5 pt-3">
              <div
                *ngFor="let item of selectedItems()"
                class="flex items-center justify-between text-sm py-1"
              >
                <div class="max-w-[120px] truncate">
                  <span class="block text-white font-medium">{{ item.product.name }}</span>
                  <span class="block text-[10px] text-gray-400 font-mono">\${{ item.product.price | number:'1.2-2' }} c/u</span>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Decrement button -->
                  <button
                    type="button"
                    (click)="decrementItem(item)"
                    class="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </button>

                  <span class="font-mono font-bold text-white text-xs w-4 text-center">{{ item.quantity }}</span>

                  <!-- Increment button -->
                  <button
                    type="button"
                    (click)="incrementItem(item)"
                    class="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
              <div *ngIf="selectedItems().length === 0" class="text-center text-gray-500 text-xs py-8">
                No hay productos en el pedido
              </div>
            </div>
          </div>

          <!-- Total display -->
          <div class="mt-4 pt-4 border-t border-white/10 shrink-0">
            <div class="flex justify-between items-end mb-4">
              <span class="text-xs text-gray-400 font-semibold uppercase">Total del Pedido</span>
              <span class="text-2xl font-black text-white font-mono">\${{ totalOrderSum() | number:'1.2-2' }}</span>
            </div>
            
            <div *ngIf="errorMessage()" class="p-2 mb-3 bg-red-900/30 border border-red-500/20 text-red-200 text-xs rounded-xl">
              {{ errorMessage() }}
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="cancel()"
                class="flex-1 py-2 border border-white/10 hover:bg-white/5 font-semibold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="save()"
                [disabled]="loading() || selectedItems().length === 0 || !tableNumber"
                class="flex-1 py-2 bg-purple-600 hover:bg-purple-500 font-semibold text-xs rounded-xl transition disabled:opacity-50"
              >
                {{ loading() ? 'Enviando...' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class OrderFormComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  products = signal<Product[]>([]);
  selectedItems = signal<SelectedItem[]>([]);
  tableNumber = 1;
  searchQuery = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Compute filtered product list based on search query
  filteredProducts = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  });

  // Compute total running sum
  totalOrderSum = computed(() => {
    return this.selectedItems().reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  });

  ngOnInit(): void {
    this.loadAvailableProducts();
  }

  loadAvailableProducts(): void {
    this.productService.getAvailable().subscribe({
      next: (data) => this.products.set(data),
      error: (err) => console.error('Error al cargar productos del catálogo:', err)
    });
  }

  addProductToOrder(product: Product): void {
    const items = [...this.selectedItems()];
    const existingIndex = items.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      items[existingIndex].quantity += 1;
    } else {
      items.push({ product, quantity: 1 });
    }

    this.selectedItems.set(items);
  }

  incrementItem(item: SelectedItem): void {
    const items = [...this.selectedItems()];
    const index = items.indexOf(item);
    if (index > -1) {
      items[index].quantity += 1;
      this.selectedItems.set(items);
    }
  }

  decrementItem(item: SelectedItem): void {
    let items = [...this.selectedItems()];
    const index = items.indexOf(item);
    if (index > -1) {
      items[index].quantity -= 1;
      if (items[index].quantity <= 0) {
        items.splice(index, 1);
      }
      this.selectedItems.set(items);
    }
  }

  save(): void {
    if (this.selectedItems().length === 0 || !this.tableNumber) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const orderPayload = {
      tableNumber: this.tableNumber,
      items: this.selectedItems().map(item => ({
        productId: item.product.id!,
        quantity: item.quantity
      }))
    };

    this.orderService.create(orderPayload).subscribe({
      next: () => {
        this.loading.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Error al enviar el pedido');
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
