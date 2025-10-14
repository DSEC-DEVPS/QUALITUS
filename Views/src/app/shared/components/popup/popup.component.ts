import { Component, Inject, OnInit } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [BrowserModule, BrowserAnimationsModule, MatSnackBarModule],
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

  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: any) {
    this.score = data.score;
    this.message = data.message;
    // Randomly select an avatar based on score
    const avatarIndex = Math.min(Math.floor(this.score / 30), this.avatars.length - 1);
    this.selectedAvatar = this.avatars[avatarIndex];
  }

  ngOnInit(): void {
    this.startAnimations();
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
