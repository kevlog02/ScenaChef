import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KitchenOrder } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KitchenService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.kitchenApiUrl}/kitchen/orders`;

  getActiveOrders(): Observable<KitchenOrder[]> {
    return this.http.get<KitchenOrder[]>(`${this.apiUrl}/active`);
  }

  updateOrderStatus(orderId: number, status: string): Observable<KitchenOrder> {
    return this.http.patch<KitchenOrder>(`${this.apiUrl}/${orderId}/status`, { status });
  }
}
