import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { PermissionsService } from '../../../../core/authorization/permissions.service';
import { EvalBiService, Arborescence } from '../../eval-bi.service';
import { EvalGrilleService, Grille } from '../../eval-grille.service';
import { ConfirmationService } from '@shared/services/confirmation.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { correspondRecherche } from '@shared/utils/recherche';
import { Pagination } from '@shared/utils/pagination';
import { ArboFormDialogComponent, DonneesFormArbo } from './arbo-form-dialog.component';
import { ArboOptionsDialogComponent, DonneesOptionsArbo } from './arbo-options-dialog.component';

/**
 * Arborescences BI : tableau des arborescences (grille, site, point de départ,
 * options, évaluations), bouton d'ajout en haut à droite, colonne Actions
 * (visionner les options, éditer, supprimer — une arborescence utilisée est
 * archivée au lieu d'être supprimée ; restaurer depuis « Archivées »).
 */
@Component({
  selector: 'app-arborescence-admin',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatTableModule, MatTooltipModule, MatPaginatorModule, MatDialogModule],
  templateUrl: './arborescence-admin.component.html',
  styleUrl: './arborescence-admin.component.scss',
})
export class ArborescenceAdminComponent implements OnInit {
  private readonly confirmation = inject(ConfirmationService);
  private readonly perms = inject(PermissionsService);
  private readonly service = inject(EvalBiService);
  private readonly grilleService = inject(EvalGrilleService);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  /** Paramétrage réservé à evaluation.parametrer (lecture seule sinon). */
  get peutParametrer(): boolean { return this.perms.can('evaluation.parametrer'); }

  readonly colonnes = ['grille', 'site', 'depart', 'options', 'evaluations', 'date', 'actions'];
  readonly pag = new Pagination<Arborescence>();
  chargement = true;
  grilles: Grille[] = [];
  sites: { id: number; nom: string }[] = [];
  arborescences: Arborescence[] = [];
  etat: 'ACTIF' | 'ARCHIVE' = 'ACTIF';
  recherche = '';

  ngOnInit(): void {
    this.grilleService.getGrilles().subscribe({ next: g => (this.grilles = g) });
    this.http.get<{ id: number; nom: string }[]>('/api/v1/site/all').subscribe({ next: s => (this.sites = s || []) });
    this.charger();
  }

  charger(): void {
    this.chargement = true;
    this.service.getArborescences({ etat: this.etat }).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: a => { this.arborescences = a || []; this.appliquer(true); },
    });
  }

  appliquer(garderPage = false): void {
    this.pag.definir(this.arborescences.filter(a => correspondRecherche(this.recherche, [a.grille, a.site, a.point_depart_libelle])), garderPage);
  }

  changerEtat(e: 'ACTIF' | 'ARCHIVE'): void { this.etat = e; this.charger(); }

  private formulaire(arbo: Arborescence | null): void {
    const data: DonneesFormArbo = { arbo, grilles: this.grilles, sites: this.sites };
    this.dialog.open(ArboFormDialogComponent, { data, panelClass: 'dlg-ref', width: '520px' }).afterClosed()
      .subscribe(ok => { if (ok) this.charger(); });
  }
  ajouter(): void { this.formulaire(null); }
  editer(a: Arborescence): void { this.formulaire(a); }

  visionner(a: Arborescence): void {
    const data: DonneesOptionsArbo = { arbo: a, modifiable: this.peutParametrer && a.etat !== 'ARCHIVE' };
    const ref = this.dialog.open(ArboOptionsDialogComponent, { data, panelClass: 'dlg-ref', width: '960px', maxWidth: '96vw' });
    ref.afterClosed().subscribe(() => { if (ref.componentInstance?.modifie) this.charger(); });
  }

  async supprimer(a: Arborescence): Promise<void> {
    const nom = `« ${a.grille} / ${a.site} »`;
    const confirme = a.utilisee
      ? await this.confirmation.confirmer({
          titre: 'Archiver l\'arborescence', type: 'attention', oui: 'Archiver',
          message: `L'arborescence ${nom} est utilisée par des évaluations : elle sera archivée (plus proposée dans les évaluations, restaurable) au lieu d'être supprimée.`,
        })
      : await this.confirmation.confirmer({
          titre: 'Supprimer l\'arborescence', type: 'danger', oui: 'Supprimer',
          message: `Supprimer définitivement l'arborescence ${nom}${a.nb_options ? ` et ses ${a.nb_options} option${(a.nb_options || 0) > 1 ? 's' : ''}` : ''} ?`,
        });
    if (!confirme) return;
    this.service.deleteArborescence(a.id).subscribe({
      next: r => { this.toastr.success(r.archivee ? 'Arborescence archivée.' : 'Arborescence supprimée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  restaurer(a: Arborescence): void {
    this.service.restaurerArborescence(a.id).subscribe({
      next: () => { this.toastr.success('Arborescence restaurée.'); this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
}
