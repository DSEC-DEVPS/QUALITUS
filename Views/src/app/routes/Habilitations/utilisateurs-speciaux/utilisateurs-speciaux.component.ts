import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HabilitationService, UtilisateurSpecial, Role } from '../habilitation.service';

/**
 * Utilisateurs spéciaux : liste des utilisateurs possédant plus ou moins de
 * droits que leur rôle (au moins une dérogation GRANT/DENY). Paginable,
 * filtrable par rôle, avec recherche rapide.
 */
@Component({
  selector: 'app-utilisateurs-speciaux',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatChipsModule,
  ],
  template: `
    <div class="cal-page">
      <mat-card class="cal-panel">
        <mat-card-header class="cal-band">
          <span class="cal-band-title"><mat-icon>admin_panel_settings</mat-icon> Utilisateurs spéciaux</span>
        </mat-card-header>
        <mat-card-content>
          <p class="cal-desc">Utilisateurs dont les droits diffèrent de leur rôle (droits en plus ou en moins).</p>

          <div class="cal-filtres-row">
            <mat-form-field appearance="outline">
              <mat-label>Recherche (nom, prénom, login)</mat-label>
              <input matInput [(ngModel)]="q" (ngModelChange)="rechercheChange($event)" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Rôle</mat-label>
              <mat-select [(ngModel)]="role" (selectionChange)="recharger(0)">
                <mat-option [value]="null">Tous</mat-option>
                @for (r of roles; track r.id) { <mat-option [value]="r.code">{{ r.libelle }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>

          <mat-card>
            <mat-card-content>
              @if (items.length === 0) {
                <p class="vide">Aucun utilisateur spécial.</p>
              } @else {
                <table mat-table [dataSource]="items" class="table">
                  <ng-container matColumnDef="nom">
                    <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
                    <td mat-cell *matCellDef="let u">{{ u.nom }} {{ u.prenom }}<br /><small>{{ u.nom_utilisateur }}</small></td>
                  </ng-container>
                  <ng-container matColumnDef="role">
                    <th mat-header-cell *matHeaderCellDef>Rôle</th>
                    <td mat-cell *matCellDef="let u">{{ u.fonction || u.role || '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="ecarts">
                    <th mat-header-cell *matHeaderCellDef>Dérogations</th>
                    <td mat-cell *matCellDef="let u">
                      @if (u.nb_grant > 0) { <mat-chip class="chip-succes">+{{ u.nb_grant }} en plus</mat-chip> }
                      @if (u.nb_deny > 0) { <mat-chip class="chip-echec">−{{ u.nb_deny }} en moins</mat-chip> }
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let u">
                      <button mat-icon-button color="primary" title="Voir/gérer les droits" (click)="ouvrir(u)"><mat-icon>tune</mat-icon></button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colonnes"></tr>
                  <tr mat-row *matRowDef="let row; columns: colonnes" class="ligne" (click)="ouvrir(row)"></tr>
                </table>
                <mat-paginator [length]="total" [pageSize]="taille" [pageIndex]="page"
                               [pageSizeOptions]="[10, 25, 50]" (page)="onPage($event)"></mat-paginator>
              }
            </mat-card-content>
          </mat-card>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class UtilisateursSpeciauxComponent implements OnInit {
  private readonly service = inject(HabilitationService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  items: UtilisateurSpecial[] = [];
  roles: Role[] = [];
  total = 0;
  page = 0;      // 0-based (mat-paginator)
  taille = 10;
  role: string | null = null;
  q = '';
  colonnes = ['nom', 'role', 'ecarts', 'actions'];

  private readonly recherche$ = new Subject<string>();

  ngOnInit(): void {
    this.service.getRoles().subscribe({ next: r => (this.roles = r || []), error: () => {} });
    this.recherche$.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.recharger(0));
    this.recharger(0);
  }

  rechercheChange(_: string): void { this.recherche$.next(this.q); }

  recharger(pageIndex: number): void {
    this.page = pageIndex;
    this.service.getUtilisateursSpeciaux({
      page: this.page + 1, taille: this.taille, role: this.role || undefined, q: this.q || undefined,
    }).subscribe({
      next: r => { this.items = r.items; this.total = r.total; },
      error: () => this.toastr.error('Erreur de chargement.'),
    });
  }

  onPage(e: PageEvent): void { this.taille = e.pageSize; this.recharger(e.pageIndex); }

  ouvrir(u: UtilisateurSpecial): void {
    this.router.navigate(['/mon-espace/habilitations/droits-utilisateur'], { queryParams: { id: u.id } });
  }
}
