import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '@shared';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'app-liste-sous-categorie',
  standalone: true,
  imports: [PageHeaderComponent, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './liste-sous-categorie.component.html',
  styleUrl: './liste-sous-categorie.component.scss',
})
export class ListeSousCategorieComponent {}
