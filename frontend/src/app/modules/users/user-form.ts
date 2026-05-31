import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.html'
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
