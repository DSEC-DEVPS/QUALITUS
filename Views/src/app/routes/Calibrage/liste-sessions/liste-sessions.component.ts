import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '@shared/services/user.service';
import { CanDirective } from '@core/authorization/can.directive';
import { CalibrageService, CalSessionListe, FiltresSession } from '../calibrage.service';

@Component({
  selector: 'app-cal-liste-sessions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatTooltipModule, MatChipsModule, CanDirective,
  ],
  templateUrl: './liste-sessions.component.html',
  styleUrl: './liste-sessions.component.scss',
})
export class ListeSessionsComponent implements OnInit {
  private readonly service = inject(CalibrageService);
  private readonly userService = inject(UserService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  filtres: FiltresSession = {};
  sessions: CalSessionListe[] = [];
  sites: any[] = [];
  chargement = false;
  colonnes = ['nom', 'date', 'site', 'grille', 'statut', 'participants', 'actions'];

  statuts = [
    { v: 'BROUILLON', l: 'Brouillon' },
    { v: 'OUVERTE', l: 'Ouverte' },
    { v: 'RESULTATS_EN_REVISION', l: 'Résultats en révision' },
    { v: 'CLOTUREE', l: 'Clôturée' },
  ];

  ngOnInit(): void {
    this.userService.getAllSite().subscribe({ next: s => (this.sites = s || []), error: () => {} });
    this.charger();
  }

  charger(): void {
    this.chargement = true;
    this.service.getSessions(this.filtres).subscribe({
      next: s => { this.sessions = s; this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les sessions.'); this.chargement = false; },
    });
  }

  reinitialiser(): void { this.filtres = {}; this.charger(); }

  libelleStatut(v: string): string { return this.statuts.find(s => s.v === v)?.l || v; }

  creer(): void { this.router.navigate(['/mon-espace/calibrage/creer']); }
  ouvrirSession(s: CalSessionListe): void {
    // Brouillon -> préparation (jauge) ; sinon -> écran de session (participant/jauge)
    const cible = s.statut === 'BROUILLON' ? 'preparer' : 'session';
    this.router.navigate(['/mon-espace/calibrage', cible, s.id]);
  }
}
