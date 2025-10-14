// Extension suggérée pour votre UserService
// Ajoutez ces méthodes à votre UserService existant
/*
import { TitleCasePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Notification } from '@core';
import { UserService } from '@shared/services/user.service';

@Component({
  selector: 'app-notification',
  template: `
    <div class="notification-template">
      <button mat-icon-button [matMenuTriggerFor]="menu" (click)="onNotificationIconClick()">
        <mat-icon 
          [matBadge]="unreadCount" 
          [matBadgeHidden]="unreadCount === 0"
          matBadgeColor="warn" 
          aria-hidden="false">
          notifications
        </mat-icon>
      </button>

      <mat-menu #menu="matMenu">
        <mat-nav-list style="height:200px">
          @if (table_notification.length === 0) {
            <mat-list-item>
              <span matListItemTitle style="font-size:12px;color:#666;text-align:center;">
                Aucune notification
              </span>
            </mat-list-item>
          }
          @for (notification of table_notification; track notification.id) {
            <mat-list-item 
              (click)="dispalay_fiche(notification.id_FICHE)"
              [class.notification-read]="notification.isRead">
              <mat-icon 
                class="m-x-16" 
                matListItemIcon 
                [style.color]="notification.isRead ? '#ccc' : '#ff8e36'">
                info
              </mat-icon>
              <span matListItemTitle>
                <span 
                  style="font-size:10px;font-weight:bold;"
                  [style.color]="notification.isRead ? '#999' : 'inherit'">
                  {{ notification.nom | titlecase }} a ajouté la fiche
                </span>
                <br />
                <span 
                  style="font-size:10px;color:blue;font-style:italic"
                  [style.color]="notification.isRead ? '#ccc' : 'blue'">
                  {{ notification.titre }}
                </span>
              </span>
              @if (!notification.isRead) {
                <mat-icon matListItemIcon style="color:#ef0000;font-size:8px;">
                  fiber_manual_record
                </mat-icon>
              }
            </mat-list-item>
            <hr />
          }
        </mat-nav-list>
      </mat-menu>
    </div>
  `,
  styles: `
    :host ::ng-deep .mat-badge-content {
      --mat-badge-background-color: #ef0000;
      --mat-badge-text-color: #fff;
    }
    
    .notification-read {
      opacity: 0.6;
      background-color: #f9f9f9;
    }
    
    .notification-template {
      position: relative;
    }
    
    mat-list-item {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    mat-list-item:hover {
      background-color: #f5f5f5;
    }
  `,
  standalone: true,
  imports: [
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    TitleCasePipe,
  ],
})
export class NotificationComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  
  table_notification: Notification[] = [];
  unreadCount: number = 0;

  ngOnInit(): void {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.userService.getAllNotification().subscribe({
      next: notifications => {
        // Ajouter la propriété isRead si elle n'existe pas
        this.table_notification = notifications.map(notification => ({
          ...notification,
          isRead: notification.isRead || false
        }));
        
        // Calculer le nombre de notifications non lues
        this.updateUnreadCount();
      },
      error: error => {
        console.log('Erreur lors du chargement des notifications:', error);
      },
    });
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.table_notification.filter(notification => !notification.isRead).length;
  }

  onNotificationIconClick(): void {
    // Marquer toutes les notifications comme lues
    this.markAllAsRead();
    
    // Remettre le compteur à zéro
    this.unreadCount = 0;
  }

  private markAllAsRead(): void {
    this.table_notification = this.table_notification.map(notification => ({
      ...notification,
      isRead: true
    }));

    // Optionnel: Envoyer une requête au backend pour persister l'état "lu"
    // this.userService.markAllNotificationsAsRead().subscribe();
  }

  dispalay_fiche(id: number): void {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }

  // Méthode utilitaire pour marquer une notification spécifique comme lue
  markNotificationAsRead(notificationId: any): void {
    const notification = this.table_notification.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.updateUnreadCount();
      
      // Optionnel: Envoyer une requête au backend
      // this.userService.markNotificationAsRead(notificationId).subscribe();
    }
  }
}*/

import { TitleCasePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Notification } from '@core';
import { UserService } from '@shared/services/user.service';

@Component({
  selector: 'app-notification',
  template: `
    <div class="notification-template">
      <button mat-icon-button [matMenuTriggerFor]="menu">
        <mat-icon [matBadge]="table_notification_length" matBadgeColor="warn" aria-hidden="false"
          >notifications</mat-icon
        >
      </button>

      <mat-menu #menu="matMenu">
        <mat-nav-list style="height:200px">
          @for (notification of table_notification; track notification) {
            <mat-list-item (click)="dispalay_fiche(notification.id_FICHE)">
              <mat-icon class="m-x-16" matListItemIcon style="color:#ff8e36">info</mat-icon>
              <span matListItemTitle>
                <span style="font-size:10px;font-weight:bold;"
                  >{{ notification.nom | titlecase }} a ajouté la fiche</span
                >
                <br />
                <span style="font-size:10px;color:blue;font-style:italic">{{
                  notification.titre
                }}</span>
              </span>
            </mat-list-item>
            <hr />
          }
        </mat-nav-list>
      </mat-menu>
    </div>
  `,
  styles: `
    :host ::ng-deep .mat-badge-content {
      --mat-badge-background-color: #ef0000;
      --mat-badge-text-color: #fff;
    }
  `,
  standalone: true,
  imports: [
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    TitleCasePipe,
  ],
})
export class NotificationComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  table_notification!: Notification[];
  table_notification_length!: number;
  ngOnInit(): void {
    this.userService.getAllNotification().subscribe({
      next: notifications => {
        this.table_notification = notifications;
        this.table_notification_length = notifications.length;
      },
      error: error => {
        console.log(error);
      },
    });
  }
  dispalay_fiche(id: number) {
    this.router.navigateByUrl(`lecture-fiche/${id}`);
  }
}
