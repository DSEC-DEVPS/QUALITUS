import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { EvalGrilleService, Grille } from '../../eval-grille.service';

@Component({
  selector: 'app-liste-grilles',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './liste-grilles.component.html',
  styleUrl: './liste-grilles.component.scss',
})
export class ListeGrillesComponent implements OnInit {
  private readonly service = inject(EvalGrilleService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  grilles: Grille[] = [];
  chargement = false;
  colonnes = ['nom', 'mode', 'type', 'statut', 'actions'];

  afficherForm = false;
  nouvelle = { nom: '', type_ressource_cible: 'HUMAINE', mode_ponderation: 'AUTO' };

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement = true;
    this.service.getGrilles().subscribe({
      next: g => { this.grilles = g; this.chargement = false; },
      error: () => { this.toastr.error('Impossible de charger les grilles.'); this.chargement = false; },
    });
  }

  creer(): void {
    if (!this.nouvelle.nom.trim()) { this.toastr.warning('Le nom est obligatoire.'); return; }
    this.service.addGrille(this.nouvelle).subscribe({
      next: res => {
        this.toastr.success('Grille créée.');
        this.afficherForm = false;
        this.nouvelle = { nom: '', type_ressource_cible: 'HUMAINE', mode_ponderation: 'AUTO' };
        this.router.navigate(['/mon-espace/evaluation/grilles/editeur', res.id]);
      },
      error: () => this.toastr.error('Erreur lors de la création.'),
    });
  }

  ouvrir(g: Grille): void {
    this.router.navigate(['/mon-espace/evaluation/grilles/editeur', g.id]);
  }

  activer(g: Grille, event: Event): void {
    event.stopPropagation();
    this.service.activerGrille(g.id).subscribe({
      next: () => { this.toastr.success('Grille activée.'); this.charger(); },
      error: err => this.toastr.error((err?.error?.message || 'Activation impossible.') + ' Vérifiez cohérence/complétude dans l’éditeur.'),
    });
  }

  desactiver(g: Grille, event: Event): void {
    event.stopPropagation();
    this.service.desactiverGrille(g.id).subscribe({
      next: () => { this.toastr.info('Grille repassée en brouillon.'); this.charger(); },
      error: () => this.toastr.error('Erreur.'),
    });
  }

  supprimer(g: Grille, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer la grille « ${g.nom} » ? Action définitive.`)) return;
    this.service.deleteGrille(g.id).subscribe({
      next: () => { this.toastr.success('Grille supprimée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Suppression impossible.'),
    });
  }
}
