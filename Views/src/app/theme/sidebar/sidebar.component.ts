import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';

import { SidemenuComponent } from '../sidemenu/sidemenu.component';
import { BrandingComponent } from '../widgets/branding.component';
import { UserPanelComponent } from './user-panel.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    BrandingComponent,
    SidemenuComponent,
    UserPanelComponent,
    CommonModule,
  ],
})
export class SidebarComponent {
  @Input() showToggle = true;
  @Input() showUser = true;
  @Input() showHeader = true;
  @Input() toggleChecked = false;
  backgroundImageUrl!: string;
  @Output() toggleCollapsed = new EventEmitter<void>();
  @Output() closeSidenav = new EventEmitter<void>();
}
