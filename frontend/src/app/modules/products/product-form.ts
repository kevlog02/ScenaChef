import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/models';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-form.html'
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
