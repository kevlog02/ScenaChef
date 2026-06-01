import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/models';
import { ProductFormComponent } from './product-form';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductFormComponent],
  templateUrl: './product-list.html'
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);

  products = signal<Product[]>([]);
  showForm = signal(false);
  selectedProduct = signal<Product | null>(null);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (data) => this.products.set(data),
      error: (err) => console.error('Error al cargar productos:', err)
    });
  }

  isAdmin(): boolean {
    return this.authService.getUserRole() === 'ADMIN';
  }

  openCreateForm(): void {
    this.selectedProduct.set(null);
    this.showForm.set(true);
  }

  openEditForm(product: Product): void {
    this.selectedProduct.set(product);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedProduct.set(null);
  }

  onFormSaved(): void {
    this.closeForm();
    this.loadProducts();
  }

  deleteProduct(product: Product): void {
    if (!product.id) return;
    if (confirm(`¿Estás seguro de que deseas eliminar ${product.name}?`)) {
      this.productService.delete(product.id).subscribe({
        next: () => this.loadProducts(),
        error: (err) => alert(err.message || 'Error al eliminar producto')
      });
    }
  }
}
