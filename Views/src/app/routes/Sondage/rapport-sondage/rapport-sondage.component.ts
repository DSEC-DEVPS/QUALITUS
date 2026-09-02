import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import { SondageService } from '@shared/services/sondage.service';
import { QuestionRapport, RapportSondage, TYPES_QUESTION } from '../interfaces';

@Component({
  selector: 'app-rapport-sondage',
  standalone: true,
  imports: [
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
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
  // largeur de barre relative au max
  largeur(nb: number, options: { nb: number }[]): number {
    const max = Math.max(1, ...options.map(o => o.nb));
    return (nb / max) * 100;
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
    const ws = XLSX.utils.json_to_sheet(lignes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport');
    XLSX.writeFile(wb, `Rapport_sondage_${this.sondageId}.xlsx`);
  }

  // helper de typage pour le template
  q(x: QuestionRapport): any {
    return x.resultat;
  }
}
