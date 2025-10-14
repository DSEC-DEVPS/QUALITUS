import { Component, inject, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { AuthService, User } from '@core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
  standalone: true,
  imports: [MatCardModule, MatTabsModule, CommonModule],
})
export class ProfileOverviewComponent implements OnInit {
  private readonly auth = inject(AuthService);
  user_infos!: User;
  ngOnInit(): void {
    this.auth.user().subscribe({
      next: user => {
        this.user_infos = user;
        console.log(user);
      },
      error: error => {
        console.log(error);
      },
    });
  }
}
