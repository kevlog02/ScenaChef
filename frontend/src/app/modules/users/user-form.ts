import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col justify-between">
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 class="text-xl font-bold text-white">{{ isEdit() ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button (click)="cancel()" class="text-gray-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form fields -->
        <form #userForm="ngForm" class="space-y-4">
          <!-- Name -->
          <div>
            <label for="name" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Nombre Completo</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="user.name"
              required
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <!-- Username -->
          <div>
            <label for="username" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="user.username"
              required
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white font-mono"
              placeholder="Ej. jperez"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Contraseña <span *ngIf="isEdit()" class="text-[10px] text-gray-500 font-normal lowercase">(dejar vacío para no cambiar)</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="user.password"
              [required]="!isEdit()"
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white"
              placeholder="••••••••"
            />
          </div>

          <!-- Role -->
          <div>
            <label for="role" class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Rol del Usuario</label>
            <select
              id="role"
              name="role"
              [(ngModel)]="user.role"
              required
              class="w-full px-4 py-2.5 bg-[#1e2538]/50 border border-white/5 rounded-xl focus:border-purple-500 focus:bg-[#1e2538]/80 outline-none text-sm text-white"
            >
              <option value="ADMIN">Administrador (ADMIN)</option>
              <option value="CAJERO">Cajero (CAJERO)</option>
              <option value="COCINERO">Cocinero (COCINERO)</option>
            </select>
          </div>

          <!-- Active status toggle -->
          <div class="flex items-center justify-between pt-2">
            <div>
              <span class="block text-sm font-medium text-white">Usuario Activo</span>
              <span class="block text-xs text-gray-400">Permitir inicio de sesión</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="active"
                [(ngModel)]="user.active"
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
          [disabled]="loading() || !userForm.form.valid"
          class="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 font-semibold text-sm rounded-xl transition disabled:opacity-50"
        >
          {{ loading() ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  `
})
export class UserFormComponent implements OnChanges {
  private readonly userService = inject(UserService);

  @Input() selectedUser: User | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isEdit = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // default empty user state
  user: User = {
    name: '',
    username: '',
    password: '',
    role: 'CAJERO',
    active: true
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUser']) {
      const selected = changes['selectedUser'].currentValue as User | null;
      if (selected) {
        this.isEdit.set(true);
        this.user = {
          name: selected.name,
          username: selected.username,
          password: '', // do not display password
          role: selected.role,
          active: selected.active
        };
      } else {
        this.isEdit.set(false);
        this.user = {
          name: '',
          username: '',
          password: '',
          role: 'CAJERO',
          active: true
        };
      }
      this.errorMessage.set(null);
    }
  }

  save(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const apiCall = this.isEdit() && this.selectedUser?.id
      ? this.userService.update(this.selectedUser.id, this.user)
      : this.userService.create(this.user);

    apiCall.subscribe({
      next: () => {
        this.loading.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Error al guardar el usuario');
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
