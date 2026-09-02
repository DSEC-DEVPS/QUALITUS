import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { EvaluationService } from '@shared/services/evaluation.service';
import { ContreEvaluation } from '../interfaces';

@Component({
  selector: 'app-contre-executer',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './contre-executer.component.html',
  styleUrl: './contre-executer.component.scss',
})
export class ContreExecuterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly srv = inject(EvaluationService);
  private readonly toast = inject(ToastrService);

  contreId!: number;
  contre?: ContreEvaluation;
  ancien: Record<number, boolean> = {};
  nouveau: Record<number, boolean> = {};
  resolution: 'OUI' | 'NON' | null = null;
  dateVisibilite: string | null = null;
  chargement = true;
  readOnly = false;

  ngOnInit(): void {
    this.contreId = Number(this.route.snapshot.paramMap.get('id'));
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.srv.getContre(this.contreId).subscribe({
      next: c => {
        this.contre = c;
        this.readOnly = c.statut === 'TERMINE';
        this.resolution = (c.resolution as 'OUI' | 'NON') || null;
        this.dateVisibilite = c.date_visibilite ? String(c.date_visibilite).slice(0, 10) : null;
        const anc = new Map((c.resultats_anciens || []).map(r => [r.id_SousItem, r.conforme]));
        const nouv = new Map((c.resultats_nouveaux || []).map(r => [r.id_SousItem, r.conforme]));
        for (const cat of c.grille || []) {
          for (const err of cat.erreurs || []) {
            for (const it of err.items || []) {
              for (const si of it.sousItems || []) {
                this.ancien[si.id] = anc.get(si.id) === 1;
                // Nouvelle valeur : reprise de l'existant, sinon de l'ancienne evaluation
                this.nouveau[si.id] = nouv.has(si.id) ? nouv.get(si.id) === 1 : anc.get(si.id) === 1;
              }
            }
          }
        }
        this.chargement = false;
      },
      error: () => {
        this.toast.error('Contre-evaluation introuvable');
        this.chargement = false;
      },
    });
  }

  get tousSousItems(): number[] {
    const ids: number[] = [];
    for (const cat of this.contre?.grille || []) {
      for (const err of cat.erreurs || []) {
        for (const it of err.items || []) {
          for (const si of it.sousItems || []) {
            ids.push(si.id);
          }
        }
      }
    }
    return ids;
  }

  terminer() {
    if (!this.dateVisibilite) {
      this.toast.warning('La date de visibilite est obligatoire');
      return;
    }
    if (!this.resolution) {
      this.toast.warning('Merci de renseigner la Resolution');
      return;
    }
    const resultats = this.tousSousItems.map(id => ({ id_SousItem: id, conforme: this.nouveau[id] ? 1 : 0 }));
    this.srv
      .terminerContre(this.contreId, {
        resolution: this.resolution,
        date_visibilite: this.dateVisibilite,
        resultats,
      })
      .subscribe({
        next: r => {
          this.toast.success(`Contre-evaluation terminee : ${r.conclusion}`);
          this.charger();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: () => this.toast.error("Une erreur s'est produite"),
      });
  }

  desactiver() {
    this.srv.setActifContre(this.contreId, 0).subscribe({
      next: () => { this.toast.success('Contre-evaluation desactivee'); this.charger(); },
      error: () => this.toast.error("Une erreur s'est produite"),
    });
  }

  retour() {
    this.router.navigate(['/mon-espace/evaluation/contre-evaluation']);
  }
}
