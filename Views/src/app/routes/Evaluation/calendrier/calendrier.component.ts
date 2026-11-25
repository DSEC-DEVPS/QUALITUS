import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { PermissionsService } from '../../../core/authorization/permissions.service';
import { EvalCalendrierService, MoisCalendrier } from '../eval-calendrier.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

const NOMS_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * Périodes d'évaluation par site : une année à la fois (sélecteur d'année pour
 * les années passées et suivantes), mois groupés par trimestre, état coloré,
 * mois en cours mis en évidence, résumé et légende ; politique de fermeture et
 * génération de l'année choisie.
 */
@Component({
  selector: 'app-calendrier',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatSelectModule, MatSlideToggleModule, MatTooltipModule],
  templateUrl: './calendrier.component.html',
  styleUrl: './calendrier.component.scss',
})
export class CalendrierComponent implements OnInit {
  private readonly perms = inject(PermissionsService);
  /** Paramétrage réservé à evaluation.parametrer (lecture seule sinon). */
  get peutParametrer(): boolean { return this.perms.can('evaluation.parametrer'); }
  private readonly service = inject(EvalCalendrierService);
  private readonly toastr = inject(ToastrService);

  readonly auj = new Date();
  readonly anneeCourante = this.auj.getFullYear();
  readonly moisCourant = this.auj.getMonth() + 1;

  sites: { id: number; nom: string }[] = [];
  idSite: number | null = null;
  tous: MoisCalendrier[] = [];
  politique: string | null = null;
  annee = this.anneeCourante;
  chargement = false;
  /** Mois en cours d'enregistrement (bascule désactivée le temps de la requête). */
  enCours = new Set<number>();

  politiques = [
    { key: 'MOIS_COURANT', label: 'Mois courant uniquement', aide: 'Seul le mois en cours est ouvert ; les autres sont fermés automatiquement.' },
    { key: 'MOIS_COURANT_ET_POSTERIEURS', label: 'Mois courant et suivants (semestre)', aide: 'Le mois en cours et les mois suivants du semestre sont ouverts.' },
    { key: 'TOUS', label: 'Tous les mois', aide: 'Tous les mois générés sont ouverts.' },
  ];
  get aidePolitique(): string { return this.politiques.find(p => p.key === this.politique)?.aide || 'Aucune politique : les mois s\'ouvrent et se ferment à la main.'; }

  ngOnInit(): void {
    this.service.getSites().subscribe({
      next: s => {
        this.sites = s || [];
        if (this.sites.length === 1) { this.idSite = this.sites[0].id; this.charger(); }
      },
    });
  }

  /** Années proposées : celles qui ont un calendrier, plus l'année passée, l'année en cours et la suivante. */
  get annees(): number[] {
    const s = new Set<number>([this.anneeCourante - 1, this.anneeCourante, this.anneeCourante + 1, ...this.tous.map(m => m.annee)]);
    return [...s].sort((a, b) => a - b);
  }
  anneeGeneree(a: number): boolean { return this.tous.some(m => m.annee === a); }
  get moisAnnee(): MoisCalendrier[] { return this.tous.filter(m => m.annee === this.annee).sort((a, b) => a.mois - b.mois); }
  get trimestres(): { titre: string; mois: MoisCalendrier[] }[] {
    const l = this.moisAnnee;
    const bornes = ['janvier à mars', 'avril à juin', 'juillet à septembre', 'octobre à décembre'];
    return [1, 2, 3, 4].map(t => ({ titre: `Trimestre ${t} · ${bornes[t - 1]}`, mois: l.filter(m => Math.ceil(m.mois / 3) === t) }))
      .filter(t => t.mois.length);
  }
  get nbOuverts(): number { return this.moisAnnee.filter(m => m.etat === 'OUVERT').length; }
  get nomSite(): string { return this.sites.find(s => s.id === this.idSite)?.nom || ''; }

  nomMois(m: MoisCalendrier): string { return NOMS_MOIS[m.mois - 1] || m.libelle; }
  estCourant(m: MoisCalendrier): boolean { return m.annee === this.anneeCourante && m.mois === this.moisCourant; }
  estPasse(m: MoisCalendrier): boolean { return m.annee < this.anneeCourante || (m.annee === this.anneeCourante && m.mois < this.moisCourant); }

  changerSite(): void { this.annee = this.anneeCourante; this.charger(); }

  charger(): void {
    if (!this.idSite) return;
    this.chargement = true;
    this.service.getCalendrier(this.idSite).subscribe({
      next: d => { this.tous = d.mois || []; this.politique = d.politique; this.chargement = false; },
      error: () => { this.chargement = false; this.toastr.error('Erreur de chargement.'); },
    });
  }

  anneePrecedente(): void { const l = this.annees; const i = l.indexOf(this.annee); if (i > 0) this.annee = l[i - 1]; }
  anneeSuivante(): void { const l = this.annees; const i = l.indexOf(this.annee); if (i < l.length - 1) this.annee = l[i + 1]; }

  generer(): void {
    if (!this.idSite) { this.toastr.warning('Sélectionnez un site.'); return; }
    this.service.generer(this.idSite, this.annee).subscribe({
      next: () => { this.toastr.success(`Calendrier ${this.annee} généré.`); this.charger(); },
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
    this.enCours.add(m.id);
    this.service.setEtatMois(m.id, nouvel).subscribe({
      next: () => { m.etat = nouvel; this.enCours.delete(m.id); },
      error: () => { this.enCours.delete(m.id); this.toastr.error('Erreur.'); },
    });
  }
}
