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

    <mat-menu #menu="matMenu" class="menu-utilisateur" xPosition="before">
      <div class="mu-entete" (click)="$event.stopPropagation()">
        <img class="mu-avatar" [src]="user.genre === 'homme' ? avatar_Homme : avatar_Femme" alt="" />
        <div class="mu-id">
          <div class="mu-nom">{{ nomComplet }}</div>
          @if (user.fonction) { <div class="mu-fonction">{{ user.fonction }}</div> }
          @if (user.site) { <div class="mu-site"><mat-icon>place</mat-icon>{{ user.site }}</div> }
        </div>
      </div>
      <div class="mu-sep"></div>
      <button routerLink="/mon-espace/profile/overview" mat-menu-item>
        <mat-icon class="mu-ic">account_circle</mat-icon>
        <span>Mon profil</span>
      </button>
      <button routerLink="/mon-espace/profile/settings" mat-menu-item>
        <mat-icon class="mu-ic">lock_reset</mat-icon>
        <span>Changer mon mot de passe</span>
      </button>
      <div class="mu-sep"></div>
      <button mat-menu-item (click)="logout()" class="mu-deconnexion">
        <mat-icon>logout</mat-icon>
        <span>Se déconnecter</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .avatar {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50rem;
    }
    ::ng-deep .menu-utilisateur { min-width: 260px !important; }
    ::ng-deep .menu-utilisateur .mu-entete { display: flex; align-items: center; gap: 12px; padding: 10px 16px 12px; cursor: default; }
    ::ng-deep .menu-utilisateur .mu-avatar { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #ffd2a8; }
    ::ng-deep .menu-utilisateur .mu-nom { font-weight: 600; color: var(--qx-texte, #2b2b2b); line-height: 1.2; }
    ::ng-deep .menu-utilisateur .mu-fonction { font-size: 12px; color: var(--qx-orange-texte, #e65100); margin-top: 2px; }
    ::ng-deep .menu-utilisateur .mu-site { display: flex; align-items: center; gap: 2px; font-size: 12px; color: var(--qx-texte-3, #888); margin-top: 2px; }
    ::ng-deep .menu-utilisateur .mu-site mat-icon { font-size: 14px; width: 14px; height: 14px; }
    ::ng-deep .menu-utilisateur .mu-sep { height: 1px; background: rgba(0, 0, 0, .08); margin: 4px 0; }
    ::ng-deep .menu-utilisateur .mu-ic { color: #ff8e36 !important; }
    ::ng-deep .menu-utilisateur .mu-deconnexion, ::ng-deep .menu-utilisateur .mu-deconnexion mat-icon { color: var(--qx-rouge, #c62828) !important; }
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
  get nomComplet(): string {
    const n = [this.user?.prenom, this.user?.nom].filter(Boolean).join(' ');
    return n || this.user?.name || '';
  }

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
