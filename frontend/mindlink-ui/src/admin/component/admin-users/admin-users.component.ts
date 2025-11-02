import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUser, AdminUsersService } from "../../services/admin-users.service";
import { SnackbarService } from "../../../app/services/snackbar.service";

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  loading = false;
  searchTerm = '';
  filterStatus: 'all' | 'active' | 'banned' = 'all';
  sortBy: 'username' | 'email' | 'ideas' | 'date' = 'date';
  sortDesc = true;

  constructor(
    private userService: AdminUsersService,
    private snackbar: SnackbarService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.snackbar.error('Errore durante il caricamento utenti.');
        this.loading = false;
      }
    });
  }

  toggleUser(user: AdminUser): void {
    this.userService.toggleUser(user.id).subscribe({
      next: (res) => {
        user.is_active = res.is_active;
        const msg = user.is_active ? 'Utente riattivato ✅' : 'Utente bannato 🚫';
        this.snackbar.success(msg);
      },
      error: () => this.snackbar.error('Errore nel ban/unban utente.')
    });
  }

  get filteredUsers(): AdminUser[] {
    let filtered = this.users;

    // Filtro per stato
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(u =>
        this.filterStatus === 'active' ? u.is_active : !u.is_active
      );
    }

    // Filtro per ricerca
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.username.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }

    // Ordinamento
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (this.sortBy) {
        case 'username':
          compareValue = a.username.localeCompare(b.username);
          break;
        case 'email':
          compareValue = a.email.localeCompare(b.email);
          break;
        case 'ideas':
          compareValue = a.idea_count - b.idea_count;
          break;
        case 'date':
          compareValue = new Date(a.date_joined).getTime() - new Date(b.date_joined).getTime();
          break;
      }
      return this.sortDesc ? -compareValue : compareValue;
    });

    return filtered;
  }

  get stats() {
    return {
      total: this.users.length,
      active: this.users.filter(u => u.is_active).length,
      banned: this.users.filter(u => !u.is_active).length,
      totalIdeas: this.users.reduce((sum, u) => sum + u.idea_count, 0)
    };
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  setFilter(status: 'all' | 'active' | 'banned'): void {
    this.filterStatus = status;
  }

  setSortBy(field: 'username' | 'email' | 'ideas' | 'date'): void {
    if (this.sortBy === field) {
      this.sortDesc = !this.sortDesc;
    } else {
      this.sortBy = field;
      this.sortDesc = true;
    }
  }

  getUserInitials(username: string): string {
    return username.substring(0, 2).toUpperCase();
  }

  getRelativeDate(date: string): string {
    const now = new Date();
    const userDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - userDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mesi fa`;
    return `${Math.floor(diffDays / 365)} anni fa`;
  }
}
