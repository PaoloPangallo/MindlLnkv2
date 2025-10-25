import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

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
  adminItems: NavItem[] = [
    { label: 'Training', route: '/admin/training', icon: 'cpu', adminOnly: true },
  ];

  // 🔔 Notifiche
  notifications = [
    { id: 1, title: 'Nuova connessione', message: 'Qualcuno ha collegato una idea alla tua', time: '5 min fa', read: false },
    { id: 2, title: 'Idea in trending', message: 'Una delle tue idee è tra i trending', time: '1 ora fa', read: false },
    { id: 3, title: 'Sistema aggiornato', message: 'Nuove funzionalità disponibili', time: '1 giorno fa', read: true },
  ];
  unreadCount = 2;

  constructor(private auth: AuthService, private router: Router) {}

  // ======================================================
  // 🔹 LIFECYCLE
  // ======================================================
  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll.bind(this));
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
    if (notif && !notif.read) {
      notif.read = true;
      this.unreadCount--;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => (n.read = true));
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
