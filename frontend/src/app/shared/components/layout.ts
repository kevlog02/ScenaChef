import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html'
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = this.authService.username;
  role = this.authService.userRole;

  isAdmin(): boolean {
    return this.role() === 'ADMIN';
  }

  isCajero(): boolean {
    return this.role() === 'CAJERO';
  }

  isCocinero(): boolean {
    return this.role() === 'COCINERO';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
