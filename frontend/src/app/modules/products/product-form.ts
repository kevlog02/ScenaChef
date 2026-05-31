import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/models';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col justify-between">
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 class="text-xl font-bold text-white">{{ isEdit() ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
          <button (click)="cancel()" class="text-gray-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form fields -->
        <form #productForm="ngForm" class="space-y-4">
          <!-- Name -->
          <div>
            <label for="name" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Nombre del Producto</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="product.name"
              required
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white"
              placeholder="Ej. Hamburguesa Clásica"
            />
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Descripción</label>
            <textarea
              id="description"
              name="description"
              [(ngModel)]="product.description"
              rows="3"
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white resize-none"
              placeholder="Ej. Con lechuga, queso y tomate..."
            ></textarea>
          </div>

          <!-- Price -->
          <div>
            <label for="price" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Precio ($)</label>
            <input
              type="number"
              id="price"
              name="price"
              [(ngModel)]="product.price"
              required
              min="0.01"
              step="0.01"
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white font-mono"
              placeholder="0.00"
            />
          </div>

          <!-- Category -->
          <div>
            <label for="category" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Categoría</label>
            <input
              type="text"
              id="category"
              name="category"
              [(ngModel)]="product.category"
              required
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white"
              placeholder="Ej. Bebidas, Comida, Acompañamientos"
            />
          </div>

          <!-- Available Toggle -->
          <div class="flex items-center justify-between pt-2">
            <div>
              <span class="block text-sm font-medium text-white">Disponible</span>
              <span class="block text-xs text-gray-400">Mostrar en el menú de pedidos</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="available"
                [(ngModel)]="product.available"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-[#1e2538] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <!-- Error Message -->
          <div *ngIf="errorMessage()" class="p-3 bg-red-900/30 border border-red-500/20 text-red-200 text-xs rounded-xl">
            {{ errorMessage() }}
          </div>
        </form>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-3 pt-6 border-t border-white/10 mt-8">
        <button
          type="button"
          (click)="cancel()"
          class="flex-1 py-2.5 border border-white/10 hover:bg-white/5 font-semibold text-sm rounded-xl transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          (click)="save()"
          [disabled]="loading() || !productForm.form.valid"
          class="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 font-semibold text-sm rounded-xl transition disabled:opacity-50"
        >
          {{ loading() ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  `
})
export class ProductFormComponent implements OnChanges {
  private readonly productService = inject(ProductService);

  @Input() selectedProduct: Product | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isEdit = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  product: Product = {
    name: '',
    description: '',
    price: 0,
    category: 'Comida',
    available: true
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedProduct']) {
      const selected = changes['selectedProduct'].currentValue as Product | null;
      if (selected) {
        this.isEdit.set(true);
        this.product = {
          name: selected.name,
          description: selected.description,
          price: selected.price,
          category: selected.category,
          available: selected.available
        };
      } else {
        this.isEdit.set(false);
        this.product = {
          name: '',
          description: '',
          price: 0,
          category: 'Comida',
          available: true
        };
      }
      this.errorMessage.set(null);
    }
  }

  save(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const apiCall = this.isEdit() && this.selectedProduct?.id
      ? this.productService.update(this.selectedProduct.id, this.product)
      : this.productService.create(this.product);

    apiCall.subscribe({
      next: () => {
        this.loading.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Error al guardar el producto');
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
