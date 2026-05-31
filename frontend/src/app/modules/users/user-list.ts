import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/models';
import { UserFormComponent } from './user-form';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserFormComponent],
  templateUrl: './user-list.html'
})
export class UserListComponent implements OnInit {
  private readonly userService = inject(UserService);

  users = signal<User[]>([]);
  showForm = signal(false);
  selectedUser = signal<User | null>(null);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAll().subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

  openCreateForm(): void {
    this.selectedUser.set(null);
    this.showForm.set(true);
  }

  openEditForm(user: User): void {
    this.selectedUser.set(user);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedUser.set(null);
  }

  onFormSaved(): void {
    this.closeForm();
    this.loadUsers();
  }

  deleteUser(user: User): void {
    if (!user.id) return;
    if (confirm(`¿Estás seguro de que deseas eliminar a ${user.name}?`)) {
      this.userService.delete(user.id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert(err.message || 'Error al eliminar usuario')
      });
    }
  }
}
