import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

const savedTheme = localStorage.getItem('user_theme');
if (savedTheme) {
  document.body.setAttribute('data-theme', savedTheme);
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  isGraph3D = false;
  showWelcome = true;

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isGraph3D = event.urlAfterRedirects.includes('graph3d');
        this.showWelcome = event.urlAfterRedirects === '/' || event.urlAfterRedirects === '/graph';
      });
  }


}
