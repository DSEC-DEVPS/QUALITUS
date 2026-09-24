import { Component, OnInit, inject } from '@angular/core';
import { toYMD } from '@shared/date-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { EvalContreService, ContreDetail, ContreCategorie, ContreErreur } from '../../eval-contre.service';

import { MatDatepickerModule } from '@angular/material/datepicker';
@Component({
  selector: 'app-contre-executer',
  standalone: true,
  imports: [MatDatepickerModule, 
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatCheckboxModule,
    MatFormFieldModule, MatInputModule, MatRadioModule, MatChipsModule, MatExpansionModule, MatTooltipModule,
  ],
  templateUrl: './contre-executer.component.html',
  styleUrl: './contre-executer.component.scss',
})
export class ContreExecuterComponent implements OnInit {
  private readonly service = inject(EvalContreService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toastr = inject(ToastrService);

  id!: number;
  detail?: ContreDetail;
  categorieActive?: ContreCategorie;
  depliee: number | null = null;

  ngOnInit(): void { this.id = Number(this.route.snapshot.params['id']); this.charger(); }

  get terminee(): boolean { return this.detail?.contre.statut === 'TERMINE'; }
  get estResponsable(): boolean { return !!this.detail?.est_responsable; }

  charger(): void {
    this.service.getDetail(this.id).subscribe({
      next: d => {
        this.detail = d;
        const prec = this.categorieActive?.id;
        this.categorieActive = d.categories.find(c => c.id === prec) || d.categories[0];
      },
      error: () => this.toastr.error('Impossible de charger la contre-évaluation.'),
    });
  }

  select(c: ContreCategorie): void { this.categorieActive = c; this.depliee = null; }
  toggleDepli(e: ContreErreur): void { this.depliee = this.depliee === e.id ? null : e.id; }

  onToggle(e: ContreErreur): void {
    if (this.terminee) return;
    const nouveau = e.coche ? 0 : 1;
    e.coche = nouveau;
    e.ecart = e.coche_initiale !== null && e.coche_initiale !== e.coche;
    this.service.toggleErreur(this.id, e.id, nouveau === 1, e.commentaire).subscribe({
      next: r => {
        if (!this.detail) return;
        const cat = this.detail.categories.find(c => c.id === r.id_categorie);
        if (cat) { cat.score_obtenu = r.score_categorie; cat.reussite = r.reussite_categorie; }
        this.detail.conclusion_live = r.conclusion_live;
      },
      error: err => { this.toastr.error(err?.error?.message || 'Erreur.'); this.charger(); },
    });
  }

  enregistrerCommentaire(e: ContreErreur): void {
    if (this.terminee) return;
    this.service.toggleErreur(this.id, e.id, e.coche === 1, e.commentaire).subscribe({ next: () => {}, error: () => this.toastr.error('Erreur.') });
  }

  // La contre-évaluation n'a plus de section Résolution : seule la date de
  // visibilité est enregistrée (obligatoire avant de terminer).
  enregistrerVisibilite(): void {
    if (!this.detail || this.terminee) return;
    const c = this.detail.contre;
    this.service.setResolution(this.id, { date_visibilite: toYMD(c.date_visibilite) }).subscribe({
      next: () => this.toastr.success('Enregistré.'), error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  terminer(): void {
    if (!this.detail) return;
    if (!this.detail.contre.date_visibilite) { this.toastr.warning('La date de visibilité est obligatoire.'); return; }
    if (!confirm('Terminer la contre-évaluation ?')) return;
    this.service.terminer(this.id).subscribe({
      next: r => { this.toastr.success(`Terminée : ${r.conclusion === 'SUCCES' ? 'Succès' : 'Échec'}.`); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  retour(): void { this.location.back(); }
}
