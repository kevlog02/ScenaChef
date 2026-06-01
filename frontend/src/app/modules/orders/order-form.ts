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
  templateUrl: './order-form.html'
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


  filteredProducts = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  });


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
