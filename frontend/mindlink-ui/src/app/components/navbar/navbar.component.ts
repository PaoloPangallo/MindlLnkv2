import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Subscription } from 'rxjs';
import {AppNotification, NotificationsService} from "../../services/notifications.services";


interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;

  menuOpen = false;
  dropdownOpen = false;
  notificationsOpen = false;
  scrolled = false;

  // 🔹 Rotte principali della navbar
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' },
    { label: 'Graph', route: '/graph', icon: 'share-2' },
    { label: '3D Graph', route: '/graph3d', icon: 'box' },
    { label: 'Ideas', route: '/ideas', icon: 'lightbulb' },
    { label: 'Explore', route: '/explore', icon: 'compass' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  // 🔹 Sezione admin opzionale
// 🔔 Notifiche


  constructor(
    private auth: AuthService,
    private router: Router,
    private notificationsService: NotificationsService) {}

  // ======================================================
  // 🔹 LIFECYCLE
  // ======================================================
notifications: AppNotification[] = [];
unreadCount = 0;
private notifSub?: Subscription;

ngOnInit(): void {
  window.addEventListener('scroll', this.onScroll.bind(this));
  this.currentUser = this.auth.currentUserValue;

  // ✅ Polling automatico notifiche ogni 30s
  this.notifSub = this.notificationsService.autoRefresh(30000).subscribe({
    next: (data) => {
      this.notifications = data;
      this.unreadCount = data.filter(n => !n.is_read).length;
    },
    error: (err) => console.error('Errore fetch notifiche:', err)
  });
}




  ngOnDestroy(): void {
  window.removeEventListener('scroll', this.onScroll.bind(this));
  this.notifSub?.unsubscribe();
}


  // ======================================================
  // 🔹 SCROLL / UI
  // ======================================================
  onScroll(): void {
    this.scrolled = window.scrollY > 10;
  }

  toggleMenu(): void {
  this.menuOpen = !this.menuOpen;
  this.notificationsOpen = false;
  this.dropdownOpen = false;
}

toggleDropdown(): void {
  this.dropdownOpen = !this.dropdownOpen;
  this.menuOpen = false;
  this.notificationsOpen = false;
}

toggleNotifications(): void {
  this.notificationsOpen = !this.notificationsOpen;
  this.menuOpen = false;
  this.dropdownOpen = false;
}

/** 🔹 Chiude tutti i menu aperti */
closeAll(): void {
  this.menuOpen = false;
  this.dropdownOpen = false;
  this.notificationsOpen = false;
}

/** 🔹 Chiude solo il menu mobile (usato nei routerLink) */
closeMenu(): void {
  this.menuOpen = false;
}

  // ======================================================
  // 🔹 NAVIGAZIONE
  // ======================================================
  navigateTo(route: string): void {
    console.log('Navigating to:', route);
    this.closeAll();
    this.router.navigate([route]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }

  // ======================================================
  // 🔹 NOTIFICHE
  // ======================================================
  markAsRead(notificationId: number): void {
  const notif = this.notifications.find(n => n.id === notificationId);
  if (notif && !notif.is_read) {
    this.notificationsService.markAsRead(notificationId).subscribe(() => {
      notif.is_read = true;
      this.unreadCount = this.notifications.filter(n => !n.is_read).length;
    });
  }
}

markAllAsRead(): void {
  const unread = this.notifications.filter(n => !n.is_read);
  unread.forEach(n => this.notificationsService.markAsRead(n.id).subscribe());
  this.notifications.forEach(n => (n.is_read = true));
  this.unreadCount = 0;
}


  // ======================================================
  // 🔹 UTIL
  // ======================================================
  get initials(): string {
    if (!this.currentUser?.username) return '';
    return this.currentUser.username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get userDisplay(): string {
    return this.currentUser?.username || 'User';
  }




}
