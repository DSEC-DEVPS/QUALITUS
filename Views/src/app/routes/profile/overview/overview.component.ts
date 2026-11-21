import { Component, inject, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { AuthService, User } from '@core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
  standalone: true,
  imports: [MatCardModule, MatTabsModule, CommonModule, MatIconModule],
})
export class ProfileOverviewComponent implements OnInit {
  private readonly auth = inject(AuthService);
  user_infos!: User;
  get genre(): string {
    const g = String(this.user_infos?.genre || '').toLowerCase();
    return g === 'homme' ? 'Homme' : g === 'femme' ? 'Femme' : this.user_infos?.genre || '';
  }
  ngOnInit(): void {
    this.auth.user().subscribe({
      next: user => {
        this.user_infos = user;
      },
      error: error => {
        console.log(error);
      },
    });
  }
}
