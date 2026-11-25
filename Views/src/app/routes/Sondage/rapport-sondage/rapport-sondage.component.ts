import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import { SondageService } from '@shared/services/sondage.service';
import { NonRepondant, QuestionRapport, RapportSondage, TYPES_QUESTION } from '../interfaces';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';

@Component({
  selector: 'app-rapport-sondage',
  standalone: true,
  imports: [ChargementComponent,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatExpansionModule,
    FormsModule,
  ],
  templateUrl: './rapport-sondage.component.html',
  styleUrl: './rapport-sondage.component.scss',
})
export class RapportSondageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srv = inject(SondageService);
  private readonly toast = inject(ToastrService);

  sondageId!: number;
  rapport?: RapportSondage;
  chargement = true;

  ngOnInit(): void {
    this.sondageId = Number(this.route.snapshot.paramMap.get('id'));
    this.srv.getRapport(this.sondageId).subscribe({
      next: r => {
        this.rapport = r;
        this.chargement = false;
      },
      error: () => {
        this.toast.error('Rapport indisponible');
        this.chargement = false;
      },
    });
  }

  typeLabel(type: string): string {
    return TYPES_QUESTION.find(t => t.value === type)?.label || type;
  }

  // % d'une option (sur le total des réponses de la question)
  pct(nb: number, total: number): number {
    return total > 0 ? Math.round((nb / total) * 100) : 0;
  }

  retour() {
    this.router.navigate(['/mon-espace/sondage/gestion']);
  }

  exporter() {
    if (!this.rapport) {
      return;
    }
    const lignes: Record<string, unknown>[] = [];
    for (const q of this.rapport.questions) {
      if (q.type === 'INFO') continue;
      if (q.type === 'CHOIX_UNIQUE' || q.type === 'CHOIX_MULTIPLE') {
        for (const o of q.resultat.options) {
          lignes.push({
            Question: q.libelle,
            Type: this.typeLabel(q.type),
            Réponse: o.libelle,
            Nombre: o.nb,
            Pourcentage: this.pct(o.nb, q.resultat.total) + '%',
          });
        }
      } else if (q.type === 'CLASSEMENT') {
        for (const o of q.resultat.options) {
          lignes.push({
            Question: q.libelle,
            Type: this.typeLabel(q.type),
            Réponse: o.libelle,
            'Rang moyen': o.rang_moyen != null ? o.rang_moyen.toFixed(2) : '—',
            Nombre: o.nb,
          });
        }
      } else if (q.type === 'CURSEUR') {
        lignes.push({
          Question: q.libelle,
          Type: this.typeLabel(q.type),
          Moyenne: q.resultat.moyenne ?? '—',
          Min: q.resultat.mini ?? '—',
          Max: q.resultat.maxi ?? '—',
          Nombre: q.resultat.nb,
        });
      } else if (q.type === 'OUVERTE') {
        for (const t of q.resultat.reponses) {
          lignes.push({ Question: q.libelle, Type: this.typeLabel(q.type), Réponse: t });
        }
      }
    }
    const wb = XLSX.utils.book_new();
    const pa = this.rapport.participation;
    const synthese: (string | number)[][] = [
      ['Sondage', this.rapport.nom],
      ['Réponses au total', this.rapport.nb_passations],
    ];
    if (pa && pa.cibles) {
      synthese.push(
        ['Ciblés', pa.cibles],
        ['  dont internes', pa.internes],
        ['  dont externes (lien public anonyme)', pa.externes],
        ['Touchés (ciblés internes ayant répondu)', pa.touches],
        ['Taux de participation (internes)', pa.taux != null ? `${pa.taux} %` : '—'],
      );
    } else {
      synthese.push(['Cible', 'Aucune cible définie']);
    }
    if (pa) synthese.push(['Réponses via le lien public (anonymes)', pa.anonymes], ['Réponses hors cible', pa.hors_cible]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(synthese), 'Synthèse');
    for (const q of this.rapport.questions) {
      if (q.type === 'INFO') continue;
      for (const l of lignes) if (l['Question'] === q.libelle && l['Répondants'] === undefined) l['Répondants'] = q.nb_repondants ?? 0;
    }
    const ws = XLSX.utils.json_to_sheet(lignes);
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport');
    if (pa && pa.non_repondants.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pa.non_repondants.map(n => ({
        Nom: n.nom, Prénom: n.prenom, Identifiant: n.nom_utilisateur || '', Site: n.site || '',
        Fonction: n.fonction || '', Email: n.email || '', Envoi: this.envoi(n),
      }))), 'Non-répondants');
    }
    XLSX.writeFile(wb, `Rapport_sondage_${this.sondageId}.xlsx`);
  }

  /** Recherche dans la liste des non-répondants. */
  rechercheNR = '';
  /** Affichage progressif (out110) : listes longues (non-répondants, réponses ouvertes) par tranches. */
  readonly PAS_NR = 50;
  readonly PAS_OUVERTES = 20;
  nbNR = this.PAS_NR;
  private readonly ouvertesAffichees = new Map<number, number>();
  nbOuvertes(idQuestion: number): number { return this.ouvertesAffichees.get(idQuestion) ?? this.PAS_OUVERTES; }
  plusOuvertes(idQuestion: number): void { this.ouvertesAffichees.set(idQuestion, this.nbOuvertes(idQuestion) + 50); }
  min(a: number, b: number): number { return Math.min(a, b); }
  /** Filtre mémorisé : recalculé seulement quand la recherche ou le rapport change. */
  private cacheNR: { cle: string; source: unknown; liste: NonRepondant[] } | null = null;
  get nonRepondantsFiltres(): NonRepondant[] {
    const l = this.rapport?.participation?.non_repondants || [];
    const q = this.rechercheNR.trim().toLowerCase();
    if (this.cacheNR && this.cacheNR.cle === q && this.cacheNR.source === l) return this.cacheNR.liste;
    const liste = !q ? l : l.filter(n => [n.nom, n.prenom, n.nom_utilisateur, n.site, n.fonction, n.email]
      .some(v => (v || '').toLowerCase().includes(q)));
    this.cacheNR = { cle: q, source: l, liste };
    return liste;
  }
  /** Canal et date du dernier envoi (email / SMS), sinon « Dans l'application ». */
  envoi(n: NonRepondant): string {
    const fr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');
    const e: string[] = [];
    if (n.date_envoi_email) e.push(`Email le ${fr(n.date_envoi_email)}`);
    if (n.date_envoi_sms) e.push(`SMS le ${fr(n.date_envoi_sms)}`);
    return e.length ? e.join(' · ') : "Dans l'application";
  }

  // helper de typage pour le template
  q(x: QuestionRapport): any {
    return x.resultat;
  }
}
