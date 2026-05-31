import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  getById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  create(order: { tableNumber: number; items: { productId: number; quantity: number }[] }): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, order);
  }

  updateStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${id}/status`, { status });
  }
}
