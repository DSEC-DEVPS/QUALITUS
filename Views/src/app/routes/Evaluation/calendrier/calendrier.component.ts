import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { EvalCalendrierService, MoisCalendrier } from '../eval-calendrier.service';

@Component({
  selector: 'app-calendrier',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule],
  templateUrl: './calendrier.component.html',
  styleUrl: './calendrier.component.scss',
})
export class CalendrierComponent implements OnInit {
  private readonly service = inject(EvalCalendrierService);
  private readonly toastr = inject(ToastrService);

  sites: { id: number; nom: string }[] = [];
  idSite: number | null = null;
  mois: MoisCalendrier[] = [];
  politique: string | null = null;

  politiques = [
    { key: 'MOIS_COURANT', label: 'Mois courant uniquement' },
    { key: 'MOIS_COURANT_ET_POSTERIEURS', label: 'Mois courant et postérieurs (semestre)' },
    { key: 'TOUS', label: 'Tous les mois' },
  ];

  ngOnInit(): void {
    this.service.getSites().subscribe({ next: s => (this.sites = s || []) });
  }

  charger(): void {
    if (!this.idSite) return;
    this.service.getCalendrier(this.idSite).subscribe({
      next: d => { this.mois = d.mois; this.politique = d.politique; },
      error: () => this.toastr.error('Erreur de chargement.'),
    });
  }

  generer(): void {
    if (!this.idSite) { this.toastr.warning('Sélectionnez un site.'); return; }
    this.service.generer(this.idSite).subscribe({
      next: () => { this.toastr.success('Calendrier généré.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  changerPolitique(): void {
    if (!this.idSite || !this.politique) return;
    this.service.setPolitique(this.idSite, this.politique).subscribe({
      next: () => { this.toastr.success('Politique appliquée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  basculerMois(m: MoisCalendrier): void {
    const nouvel = m.etat === 'OUVERT' ? 'FERME' : 'OUVERT';
    this.service.setEtatMois(m.id, nouvel).subscribe({
      next: () => { m.etat = nouvel; },
      error: () => this.toastr.error('Erreur.'),
    });
  }
}
