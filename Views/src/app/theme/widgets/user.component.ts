import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, map, tap } from 'rxjs';

import { AuthService, SettingsService, User } from '@core';

@Component({
  selector: 'app-user',
  template: `
    <button mat-icon-button [matMenuTriggerFor]="menu">
      @if (user.genre === 'Femme') {
        <img class="avatar" [src]="avatar_Femme" width="24" alt="avatar" />
      } @else if (user.genre === 'homme') {
        <img class="avatar" [src]="avatar_Homme" width="24" alt="avatar" />
      } @else {
        <img class="avatar" [src]="avatar_Femme" width="24" alt="avatar" />
      }
    </button>

    <mat-menu #menu="matMenu">
      <button routerLink="/mon-espace/profile/overview" mat-menu-item>
        <mat-icon style="color: #ff8e36">account_circle</mat-icon>
        <span>{{ 'profil' }}</span>
      </button>
      <button routerLink="/mon-espace/profile/settings" mat-menu-item>
        <mat-icon style="color: #ff8e36">editer</mat-icon>
        <span>{{ 'edit_profile' }}</span>
      </button>

      <button mat-menu-item (click)="logout()">
        <mat-icon style="color: #ff8e36">exit_to_app</mat-icon>
        <span>{{ 'deconnexion' }}</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .avatar {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50rem;
    }
  `,
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, TranslateModule],
})
export class UserComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService);
  avatar_Femme = 'img/profileFemme.png';
  avatar_Homme = 'img/profileHomme.png';

  user!: User;

  ngOnInit(): void {
    this.auth
      .user()
      .pipe(
        tap(user => (this.user = user)),

        debounceTime(10)
      )
      .subscribe(() => this.cdr.detectChanges());
  }

  logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigateByUrl('/auth/login');
    });
  }

  restore() {
    this.settings.reset();
    window.location.reload();
  }
}
