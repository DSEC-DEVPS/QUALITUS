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
*/

import { TitleCasePipe } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Notification } from './notification.interface';
import { UserService } from './notification.service';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-notification',
  template: `
    <div class="notification-template">
      <button mat-icon-button [matMenuTriggerFor]="menu" (menuOpened)="onMenuOpened()">
        <mat-icon 
          [matBadge]="unreadCount" 
          [matBadgeHidden]="unreadCount === 0"
          matBadgeColor="warn" 
          aria-hidden="false"
        >
          notifications
        </mat-icon>
      </button>

      <mat-menu #menu="matMenu" class="notification-menu">
        <div class="notification-header" (click)="$event.stopPropagation()">
          <span class="notification-title">Notifications</span>
        
        </div>
        
        <mat-nav-list class="notification-list">
          @if (table_notification.length === 0) {
            <div class="no-notifications">
              <mat-icon>notifications_none</mat-icon>
              <p>Aucune notification</p>
            </div>
          } @else {
            @for (notification of table_notification; track notification.id) {
              <mat-list-item 
                (click)="displayFiche(notification)"
                [class.unread]="!notification.isRead"
                (mouseenter)="markAsReadOnHover(notification)"
              >
                <mat-icon 
                  class="m-x-16" 
                  matListItemIcon 
                  [style.color]="notification.isRead ? '#9e9e9e' : '#ff8e36'"
                >
                  {{ notification.isRead ? 'check_circle' : 'info' }}
                </mat-icon>
                <span matListItemTitle>
                  <span class="notification-author">
                    {{ notification.nom | titlecase }} a ajouté la fiche
                  </span>
                  <br />
                  <span class="notification-title-text">
                    {{ notification.titre }}
                  </span>
                </span>
                @if (!notification.isRead) {
                  <span class="unread-indicator"></span>
                }
              </mat-list-item>
              <hr />
            }
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

    .notification-menu {
      max-width: 400px;
      min-width: 350px;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #f5f5f5;
    }

    .notification-title {
      font-weight: bold;
      font-size: 16px;
    }

    .mark-all-read {
      font-size: 12px;
      color: #1976d2;
    }

    .notification-list {
      max-height: 400px;
      overflow-y: auto;
      padding: 0 !important;
    }

    .notification-list mat-list-item {
      cursor: pointer;
      transition: background-color 0.2s;
      position: relative;
      padding: 8px 12px;
      min-height: 56px;
    }

    .notification-list mat-list-item:hover {
      background-color: #f5f5f5;
    }

    .notification-list mat-list-item.unread {
      background-color: #e3f2fd;
    }

    .notification-list mat-list-item.unread:hover {
      background-color: #bbdefb;
    }

    .notification-author {
      font-size: 12px;
      font-weight: bold;
      color: #333;
    }

    .notification-title-text {
      font-size: 11px;
      color: #1976d2;
      font-style: italic;
    }

    .unread-indicator {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background-color: #ef0000;
      border-radius: 50%;
    }

    .no-notifications {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #9e9e9e;
    }

    .no-notifications mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }

    hr {
      margin: 0;
      border: none;
      border-top: 1px solid #e0e0e0;
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
export class NotificationComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private destroy$ = new Subject<void>();
  
  table_notification: Notification[] = [];
  unreadCount: number = 0;

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.userService.getAllNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: notifications => {
          // Afficher toutes les notifications, calculer le nombre non lues
          this.table_notification = notifications;
          console.log("la table de notification");
          console.log(this.table_notification);
          this.unreadCount = notifications.filter(n => !n.isRead).length;
        },
        error: error => {
          console.error('Erreur lors du chargement des notifications:', error);
        },
      });
  }

  onMenuOpened(): void {
    // Optionnel : vous pouvez ajouter une logique ici si nécessaire
  }

  markAsReadOnHover(notification: Notification): void {
    if (!notification.isRead) {
      notification.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      
      this.userService.markNotificationAsRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: error => {
            console.error('Erreur lors du marquage de la notification:', error);
            // Restaurer l'état en cas d'erreur
            notification.isRead = false;
            this.unreadCount++;
          }
        });
    }
  }

  markAllAsRead(): void {
    const unreadNotifications = this.table_notification.filter(n => !n.isRead);
    const notificationIds = unreadNotifications.map(n => n.id);

    if (notificationIds.length === 0) return;

    this.userService.markAllNotificationsAsRead(notificationIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.table_notification.forEach(n => n.isRead = true);
          this.unreadCount = 0;
        },
        error: error => {
          console.error('Erreur lors du marquage de toutes les notifications:', error);
        }
      });
  }

  displayFiche(notification: Notification): void {
    // Marquer comme lu avant de naviguer
    if (!notification.isRead) {
      this.markAsReadOnHover(notification);
    }
    this.router.navigateByUrl(`lecture-fiche/${notification.id_FICHE}`);
  }
}