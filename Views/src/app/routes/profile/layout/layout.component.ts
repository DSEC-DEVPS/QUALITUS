import { TitleCasePipe, UpperCasePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService, User } from '@core';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '@shared';

@Component({
  selector: 'app-profile-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatIconModule,
    PageHeaderComponent,
    TranslateModule,
    TitleCasePipe,
    UpperCasePipe,
  ],
})
export class ProfileLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  imageUrl = 'img/profileHomme.png';

  user!: User;

  ngOnInit(): void {
    this.auth.user().subscribe(user => {
      this.user = user;
      this.imageUrl = user?.genre === 'homme' ? 'img/profileHomme.png' : 'img/profileFemme.png';
    });
  }
  get nomComplet(): string {
    const n = [this.user?.prenom, this.user?.nom].filter(Boolean).join(' ');
    return n || this.user?.name || '';
  }

  logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigateByUrl('/auth/login');
    });
  }
}
