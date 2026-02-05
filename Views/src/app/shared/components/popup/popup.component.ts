import { Component, Inject, OnInit } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule,MatSnackBarRef } from '@angular/material/snack-bar';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';



@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [BrowserModule, BrowserAnimationsModule, MatSnackBarModule,MatIconModule],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
  animations: [
    trigger('bounce', [
      state('initial', style({ transform: 'scale(1)' })),
      state('bounce', style({ transform: 'scale(1.2)' })),
      transition('initial => bounce', animate('300ms ease-in')),
      transition('bounce => initial', animate('300ms ease-out')),
    ]),
    trigger('rotate', [
      state('initial', style({ transform: 'rotate(0)' })),
      state('rotated', style({ transform: 'rotate(360deg)' })),
      transition('initial => rotated', animate('500ms ease-in')),
      transition('rotated => initial', animate('500ms ease-out')),
    ]),
  ],
})
export class PopupComponent implements OnInit {
  score: number;
  message: string;
  avatarState = 'initial';
  rotationState = 'initial';

  // Define multiple avatar options
  avatars = [
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=happy',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=star',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=celebrate',
  ];

  selectedAvatar = '';
  ngOnInit(): void {
    this.startAnimations();
  }
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: { score: number; message: string },
    private snackBarRef: MatSnackBarRef<PopupComponent>
  ) {
this.score = data.score;
    this.message = data.message;
    // Randomly select an avatar based on score
    const avatarIndex = Math.min(Math.floor(this.score / 30), this.avatars.length - 1);
    this.selectedAvatar = this.avatars[avatarIndex];

  }

  close(): void {
    this.snackBarRef.dismiss();
  }

  getIcon(): string {
    // Retourne une icône basée sur le score
    if (this.data.score >= 80) {
      return 'emoji_events'; // Trophée pour score élevé
    } else if (this.data.score >= 50) {
      return 'thumb_up'; // Pouce levé pour score moyen
    } else {
      return 'info'; // Info pour score faible
    }
  }

  getIconClass(): string {
    // Retourne une classe CSS basée sur le score
    if (this.data.score >= 80) {
      return 'success';
    } else if (this.data.score >= 50) {
      return 'warning';
    } else {
      return '';
    }
  }

  startAnimations(): void {
    // Start bounce animation
    setInterval(() => {
      this.avatarState = this.avatarState === 'initial' ? 'bounce' : 'initial';
    }, 1000);

    // Start rotation animation
    setInterval(() => {
      this.rotationState = this.rotationState === 'initial' ? 'rotated' : 'initial';
    }, 2000);
  }
}

