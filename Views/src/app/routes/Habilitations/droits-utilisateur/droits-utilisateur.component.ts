import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HabilitationService, UserLite, DroitItem } from '../habilitation.service';

@Component({
  selector: 'app-droits-utilisateur',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatButtonToggleModule, MatTooltipModule,
  ],
  templateUrl: './droits-utilisateur.component.html',
  styleUrl: './droits-utilisateur.component.scss',
})
export class DroitsUtilisateurComponent {
  private readonly service = inject(HabilitationService);
  private readonly toastr = inject(ToastrService);

  private readonly recherche$ = new Subject<string>();
  resultats: UserLite[] = [];
  terme = '';

  selection: UserLite | null = null;
  admin = false;
  modules: { module: string; items: DroitItem[] }[] = [];

  constructor() {
    this.recherche$
      .pipe(debounceTime(250), distinctUntilChanged(), switchMap(q => this.service.rechercherUtilisateurs(q)))
      .subscribe({ next: r => (this.resultats = r), error: () => {} });
  }

  chercher(q: string): void { this.terme = q; this.recherche$.next(q); }

  choisir(u: UserLite): void {
    this.resultats = [];
    this.terme = `${u.prenom} ${u.nom}`;
    this.service.getDroitsUtilisateur(u.id).subscribe({
      next: d => {
        this.selection = d.utilisateur;
        this.admin = d.admin;
        const map = new Map<string, DroitItem[]>();
        for (const p of d.permissions) {
          if (!map.has(p.module)) map.set(p.module, []);
          map.get(p.module)!.push(p);
        }
        this.modules = Array.from(map.entries()).map(([module, items]) => ({ module, items }));
      },
      error: () => this.toastr.error('Impossible de charger les droits.'),
    });
  }

  /** Valeur du sélecteur 3 états pour une permission. */
  etat(it: DroitItem): 'GRANT' | 'DENY' | 'NONE' { return it.sens ?? 'NONE'; }

  changer(it: DroitItem, sens: 'GRANT' | 'DENY' | 'NONE'): void {
    if (!this.selection) return;
    this.service.setDroit(this.selection.id, it.id, sens).subscribe({
      next: () => {
        it.sens = sens === 'NONE' ? null : sens;
        it.effectif = it.sens === 'GRANT' ? true : it.sens === 'DENY' ? false : it.parRole;
        this.toastr.success('Dérogation enregistrée.');
      },
      error: () => this.toastr.error('Modification impossible.'),
    });
  }
}
