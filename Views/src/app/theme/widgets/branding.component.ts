import { Component, inject, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { AuthService, User } from '@core';
@Component({
  selector: 'app-branding',
  template: `
    <a class="branding" routerLink="" matTooltip="Home">
      <mat-icon class="home_icon">home</mat-icon>
      @if (showName) {
        <span class="branding-name">{{ 'Home' }}</span>
      }
    </a>
  `,
  styles: `
    .branding {
      display: flex;
      align-items: center;
      margin: 0 0.5rem;
      text-decoration: none;
      white-space: nowrap;
      color: inherit;
      border-radius: 50rem;
    }

    .branding-logo {
      width: 2rem;
      height: 2rem;
      border-radius: 50rem;
    }

    .branding-name {
      margin: 0 0.5rem;
      font-size: 1rem;
      font-weight: 500;
    }
    .home_icon {
      color: #ff8e36;
    }
  `,
  standalone: true,
  imports: [RouterLink, MatTooltipModule, MatIcon],
})
export class BrandingComponent implements OnInit {
  private readonly auth = inject(AuthService);
  user!: User;
  @Input() showName = true;
  @Input() userName!: string;
  ngOnInit(): void {
    this.auth.user().subscribe(user => (this.user = user));
  }
}
