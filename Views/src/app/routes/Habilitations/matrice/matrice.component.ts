import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { HabilitationService, Matrice, Observation, Permission } from '../habilitation.service';

@Component({
  selector: 'app-matrice-droits',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatCheckboxModule, MatButtonToggleModule, MatTooltipModule, MatTabsModule, MatTableModule,
  ],
  templateUrl: './matrice.component.html',
  styleUrl: './matrice.component.scss',
})
export class MatriceComponent implements OnInit {
  private readonly service = inject(HabilitationService);
  private readonly toastr = inject(ToastrService);

  matrice: Matrice | null = null;
  modules: { module: string; permissions: Permission[] }[] = [];
  mode = 'OBSERVATION';
  observations: Observation[] = [];
  chargement = true;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.chargement = true;
    this.service.getMatrice().subscribe({
      next: m => {
        this.matrice = m;
        // regroupement des permissions par module (ordre stable)
        const map = new Map<string, Permission[]>();
        for (const p of m.permissions) {
          if (!map.has(p.module)) map.set(p.module, []);
          map.get(p.module)!.push(p);
        }
        this.modules = Array.from(map.entries()).map(([module, permissions]) => ({ module, permissions }));
        this.chargement = false;
      },
      error: () => { this.toastr.error('Impossible de charger la matrice.'); this.chargement = false; },
    });
    this.service.getMode().subscribe({ next: r => (this.mode = r.mode), error: () => {} });
    this.chargerObservations();
  }

  chargerObservations(): void {
    this.service.getObservations().subscribe({ next: o => (this.observations = o), error: () => {} });
  }

  estActif(idRole: number, idPerm: number): boolean {
    return !!(this.matrice && this.matrice.grid[idRole] && this.matrice.grid[idRole][idPerm]);
  }

  basculer(idRole: number, idPerm: number, roleCode: string): void {
    if (!this.matrice) return;
    if (roleCode === 'R_ADMI') { this.toastr.info('R_ADMI dispose de toutes les permissions (super-administrateur).'); return; }
    const actuel = this.estActif(idRole, idPerm);
    const cible = !actuel;
    this.service.toggle(idRole, idPerm, cible).subscribe({
      next: () => {
        (this.matrice!.grid[idRole] ||= {})[idPerm] = cible;
      },
      error: () => this.toastr.error('Modification impossible.'),
    });
  }

  changerMode(m: string): void {
    this.service.setMode(m).subscribe({
      next: () => { this.mode = m; this.toastr.success('Mode de contrôle : ' + m + ' (propagation ≤ 30 s).'); },
      error: () => this.toastr.error('Impossible de changer le mode.'),
    });
  }

  toutCocherModule(module: string, idRole: number, roleCode: string, valeur: boolean): void {
    if (roleCode === 'R_ADMI') return;
    const grp = this.modules.find(g => g.module === module);
    if (!grp || !this.matrice) return;
    for (const p of grp.permissions) {
      if (this.estActif(idRole, p.id) !== valeur) {
        this.service.toggle(idRole, p.id, valeur).subscribe({
          next: () => { (this.matrice!.grid[idRole] ||= {})[p.id] = valeur; },
          error: () => {},
        });
      }
    }
  }
}
