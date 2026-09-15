import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { EvalBiService, Arborescence, BiOption } from '../../eval-bi.service';
import { EvalGrilleService, Grille } from '../../eval-grille.service';

@Component({
  selector: 'app-arborescence-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './arborescence-admin.component.html',
  styleUrl: './arborescence-admin.component.scss',
})
export class ArborescenceAdminComponent implements OnInit {
  private readonly service = inject(EvalBiService);
  private readonly grilleService = inject(EvalGrilleService);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  grilles: Grille[] = [];
  sites: { id: number; nom: string }[] = [];
  arborescences: Arborescence[] = [];

  nouvelle = { id_grille: null as number | null, id_site: null as number | null, point_depart_libelle: '' };

  arboSelectionnee?: Arborescence;
  options: BiOption[] = [];
  niveaux = [1, 2, 3, 4, 5];
  nouvelleOption = { niveau: 1, id_parent: null as number | null, libelle: '' };

  ngOnInit(): void {
    this.grilleService.getGrilles().subscribe({ next: g => (this.grilles = g) });
    this.http.get<{ id: number; nom: string }[]>('/api/v1/site/all').subscribe({ next: s => (this.sites = s || []) });
    this.charger();
  }

  charger(): void {
    this.service.getArborescences().subscribe({ next: a => (this.arborescences = a) });
  }

  creer(): void {
    if (!this.nouvelle.id_grille || !this.nouvelle.id_site || !this.nouvelle.point_depart_libelle.trim()) {
      this.toastr.warning('Grille, site et point de départ obligatoires.'); return;
    }
    this.service.addArborescence({
      id_grille: this.nouvelle.id_grille, id_site: this.nouvelle.id_site,
      point_depart_libelle: this.nouvelle.point_depart_libelle.trim(),
    }).subscribe({
      next: () => { this.toastr.success('Arborescence créée.'); this.nouvelle = { id_grille: null, id_site: null, point_depart_libelle: '' }; this.charger(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  ouvrir(a: Arborescence): void {
    this.arboSelectionnee = a;
    this.chargerOptions();
  }

  chargerOptions(): void {
    if (!this.arboSelectionnee) return;
    this.service.getArbreOptions(this.arboSelectionnee.id).subscribe({ next: o => (this.options = o) });
  }

  optionsDuNiveau(n: number): BiOption[] {
    return this.options.filter(o => o.niveau === n);
  }
  parentsPossibles(): BiOption[] {
    return this.nouvelleOption.niveau <= 1 ? [] : this.options.filter(o => o.niveau === this.nouvelleOption.niveau - 1);
  }
  libelleParent(o: BiOption): string {
    const p = this.options.find(x => x.id === o.id_parent);
    return p ? p.libelle : '—';
  }

  ajouterOption(): void {
    if (!this.arboSelectionnee) return;
    const { niveau, id_parent, libelle } = this.nouvelleOption;
    if (!libelle.trim()) { this.toastr.warning('Libellé obligatoire.'); return; }
    if (niveau > 1 && !id_parent) { this.toastr.warning('Sélectionnez le parent (niveau précédent).'); return; }
    this.service.addOption({ id_arborescence: this.arboSelectionnee.id, id_parent: niveau > 1 ? id_parent : null, niveau, libelle: libelle.trim() }).subscribe({
      next: () => { this.toastr.success('Option ajoutée.'); this.nouvelleOption.libelle = ''; this.chargerOptions(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }

  supprimerOption(o: BiOption): void {
    if (!confirm(`Supprimer « ${o.libelle} » et ses options dépendantes ?`)) return;
    this.service.deleteOption(o.id).subscribe({
      next: () => { this.toastr.success('Supprimée.'); this.chargerOptions(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur.'),
    });
  }
}
