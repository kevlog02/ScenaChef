import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login';
import { LayoutComponent } from './shared/components/layout';
import { UserListComponent } from './modules/users/user-list';
import { ProductListComponent } from './modules/products/product-list';
import { OrderListComponent } from './modules/orders/order-list';
import { KitchenPanelComponent } from './modules/kitchen/kitchen-panel';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'usuarios',
        component: UserListComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'productos',
        component: ProductListComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'CAJERO'] }
      },
      {
        path: 'pedidos',
        component: OrderListComponent,
        canActivate: [roleGuard],
        data: { roles: ['CAJERO'] }
      },
      {
        path: 'cocina',
        component: KitchenPanelComponent,
        canActivate: [roleGuard],
        data: { roles: ['COCINERO'] }
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
