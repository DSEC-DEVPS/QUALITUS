import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, concatMap, from, toArray, catchError, of, map } from 'rxjs';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { toYMD } from '@shared/date-utils';
import { Pagination } from '@shared/utils/pagination';
import { correspondRecherche } from '@shared/utils/recherche';
import { EvalBiService } from '../../eval-bi.service';
import { EvalCoachingService } from '../../eval-coaching.service';
import { ChargementComponent } from '@shared/components/chargement/chargement.component';
import { DecisionOptionDialogComponent, DonneesDecision, ResultatDecision } from './decision-option-dialog.component';

interface OptionUnifiee {
  source: 'BI' | 'COACHING';
  id: number;
  niveau: number;
  libelle: string;
  id_evaluation: number;
  /** Arborescence BI (grille / site) ou « Arbre de coaching ». */
  contexte: string;
  cle_contexte: string;
  agent: string;
  date_appel: string | null;
  id_proposeur: number | null;
  proposeur: string;
  parent_libelle: string | null;
  dateCreation: string;
}

/**
 * Validation des options proposées (BI et coaching), pensée pour un grand volume :
 * tableau compact, filtres (source, arborescence, proposeur, période), recherche,
 * tri, compteur, pagination, sélection multiple avec validation ou rejet groupés
 * (motif commun). Une option se valide (reformulation possible) ou se rejette dans
 * une fenêtre qui en rappelle le contexte.
 */
@Component({
  selector: 'app-validation-options',
  standalone: true,
  imports: [ChargementComponent, CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatTableModule, MatTooltipModule, MatDatepickerModule, MatPaginatorModule, MatDialogModule],
  templateUrl: './validation-options.component.html',
  styleUrl: './validation-options.component.scss',
})
export class ValidationOptionsComponent implements OnInit {
  private readonly bi = inject(EvalBiService);
  private readonly coaching = inject(EvalCoachingService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly colonnes = ['select', 'source', 'option', 'contexte', 'evaluation', 'proposeur', 'actions'];
  readonly pag = new Pagination<OptionUnifiee>();
  options: OptionUnifiee[] = [];
  chargement = false;
  enCours = false;

  source: '' | 'BI' | 'COACHING' = '';
  contexte = '';
  idProposeur: number | null = null;
  du: any = null;
  au: any = null;
  recherche = '';
  tri: 'recent' | 'ancien' = 'ancien';
  contextes: { cle: string; libelle: string; n: number }[] = [];
  proposeurs: { id: number; nom: string; n: number }[] = [];
  /** Clés « SOURCE-id » sélectionnées. */
  readonly selection = new Set<string>();

  ngOnInit(): void { this.charger(); }

  k(o: OptionUnifiee): string { return `${o.source}-${o.id}`; }

  charger(): void {
    this.chargement = true;
    forkJoin({ bi: this.bi.getOptionsEnAttente(), co: this.coaching.getOptionsEnAttente() }).subscribe({
      next: ({ bi, co }) => {
        const nom = (n?: string | null, p?: string | null) => `${n || ''} ${p || ''}`.trim();
        const l1: OptionUnifiee[] = (bi as any[]).map(o => ({
          source: 'BI', id: o.id, niveau: o.niveau, libelle: o.libelle, id_evaluation: o.id_evaluation_origine,
          contexte: `${o.grille} / ${o.site}`, cle_contexte: `BI-${o.id_arborescence ?? o.grille + '/' + o.site}`,
          agent: nom(o.agent_nom, o.agent_prenom), date_appel: o.date_appel || null,
          id_proposeur: o.propose_par ?? null, proposeur: nom(o.proposeur_nom, o.proposeur_prenom),
          parent_libelle: o.parent_libelle, dateCreation: o.dateCreation,
        }));
        const l2: OptionUnifiee[] = (co as any[]).map(o => ({
          source: 'COACHING', id: o.id, niveau: o.niveau, libelle: o.libelle, id_evaluation: o.id_evaluation,
          contexte: 'Arbre de coaching', cle_contexte: 'COACHING',
          agent: nom(o.agent_nom, o.agent_prenom), date_appel: o.date_appel || null,
          id_proposeur: o.propose_par ?? null, proposeur: nom(o.proposeur_nom, o.proposeur_prenom),
          parent_libelle: o.parent_libelle, dateCreation: o.dateCreation,
        }));
        this.options = [...l1, ...l2];
        const compte = <T>(cle: (o: OptionUnifiee) => T, lib: (o: OptionUnifiee) => string) => {
          const m = new Map<T, { libelle: string; n: number }>();
          for (const o of this.options) { const c = cle(o); const x = m.get(c); if (x) x.n++; else m.set(c, { libelle: lib(o), n: 1 }); }
          return [...m.entries()].sort((a, b) => a[1].libelle.localeCompare(b[1].libelle));
        };
        this.contextes = compte(o => o.cle_contexte, o => o.contexte).map(([cle, v]) => ({ cle, libelle: v.libelle, n: v.n }));
        this.proposeurs = compte(o => o.id_proposeur, o => o.proposeur || '—').filter(([id]) => id !== null)
          .map(([id, v]) => ({ id: id as number, nom: v.libelle, n: v.n }));
        // La sélection ne garde que les options encore en attente.
        const restantes = new Set(this.options.map(o => this.k(o)));
        for (const s of [...this.selection]) if (!restantes.has(s)) this.selection.delete(s);
        this.appliquer(true);
        this.chargement = false;
      },
      error: () => { this.toastr.error('Impossible de charger les options.'); this.chargement = false; },
    });
  }

  appliquer(garderPage = false): void {
    const du = toYMD(this.du), au = toYMD(this.au);
    const l = this.options.filter(o =>
      (!this.source || o.source === this.source) &&
      (!this.contexte || o.cle_contexte === this.contexte) &&
      (!this.idProposeur || o.id_proposeur === this.idProposeur) &&
      (!du || String(o.dateCreation).slice(0, 10) >= du) &&
      (!au || String(o.dateCreation).slice(0, 10) <= au) &&
      correspondRecherche(this.recherche, [o.libelle, o.parent_libelle, o.contexte, o.agent, o.proposeur, o.id_evaluation]));
    l.sort((a, b) => (a.dateCreation < b.dateCreation ? -1 : a.dateCreation > b.dateCreation ? 1 : 0) * (this.tri === 'ancien' ? 1 : -1));
    this.pag.definir(l, garderPage);
  }

  reinitialiser(): void {
    this.source = ''; this.contexte = ''; this.idProposeur = null; this.du = null; this.au = null; this.recherche = '';
    this.appliquer();
  }

  get nbBi(): number { return this.options.filter(o => o.source === 'BI').length; }
  get nbCoaching(): number { return this.options.length - this.nbBi; }

  // --- sélection (sur les lignes filtrées) ---
  get toutesFiltreesCochees(): boolean { return this.pag.length > 0 && this.pag.donnees.every(o => this.selection.has(this.k(o))); }
  get quelquesCochees(): boolean { return this.pag.donnees.some(o => this.selection.has(this.k(o))) && !this.toutesFiltreesCochees; }
  basculerTout(c: boolean): void { for (const o of this.pag.donnees) c ? this.selection.add(this.k(o)) : this.selection.delete(this.k(o)); }
  basculer(o: OptionUnifiee, c: boolean): void { c ? this.selection.add(this.k(o)) : this.selection.delete(this.k(o)); }
  get selectionnees(): OptionUnifiee[] { return this.options.filter(o => this.selection.has(this.k(o))); }

  private ouvrir(mode: 'valider' | 'rejeter', options: OptionUnifiee[]): Observable<ResultatDecision | undefined> {
    const data: DonneesDecision = { mode, options };
    return this.dialog.open(DecisionOptionDialogComponent, { data, panelClass: 'dlg-ref', width: '560px', autoFocus: 'dialog' }).afterClosed();
  }

  private decider(o: OptionUnifiee, r: ResultatDecision, mode: 'valider' | 'rejeter'): Observable<boolean> {
    const obs: Observable<unknown> = mode === 'valider'
      ? (o.source === 'BI' ? this.bi.validerOption(o.id, r.libelle) : this.coaching.valider(o.id, r.libelle))
      : (o.source === 'BI' ? this.bi.rejeterOption(o.id, r.motif!) : this.coaching.rejeter(o.id, r.motif!));
    return obs.pipe(map(() => true), catchError(() => of(false)));
  }

  /** Une option : fenêtre de décision (reformulation ou motif). */
  decision(o: OptionUnifiee, mode: 'valider' | 'rejeter'): void {
    this.ouvrir(mode, [o]).subscribe(r => {
      if (!r) return;
      this.enCours = true;
      this.decider(o, r, mode).subscribe(ok => {
        this.enCours = false;
        if (ok) { this.toastr.success(mode === 'valider' ? 'Option validée.' : 'Option rejetée.'); this.selection.delete(this.k(o)); }
        else this.toastr.error('La décision n\'a pas pu être enregistrée.');
        this.charger();
      });
    });
  }

  /** Sélection : validation ou rejet groupés (motif commun), une requête après l'autre. */
  decisionGroupee(mode: 'valider' | 'rejeter'): void {
    const liste = this.selectionnees;
    if (!liste.length) return;
    this.ouvrir(mode, liste).subscribe(r => {
      if (!r) return;
      this.enCours = true;
      // Une validation valide aussi les ancêtres en attente : on traite les niveaux les plus hauts d'abord.
      const ordre = [...liste].sort((a, b) => a.niveau - b.niveau);
      from(ordre).pipe(concatMap(o => this.decider(o, { motif: r.motif }, mode)), toArray()).subscribe(res => {
        this.enCours = false;
        const ok = res.filter(Boolean).length;
        const ko = res.length - ok;
        const verbe = mode === 'valider' ? 'validée' : 'rejetée';
        if (ok) this.toastr.success(`${ok} option${ok > 1 ? 's' : ''} ${verbe}${ok > 1 ? 's' : ''}.`);
        if (ko) this.toastr.warning(`${ko} option${ko > 1 ? 's' : ''} non traitée${ko > 1 ? 's' : ''} (déjà décidée${ko > 1 ? 's' : ''} ou erreur).`);
        this.selection.clear();
        this.charger();
      });
    });
  }

  ouvrirEvaluation(o: OptionUnifiee, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/mon-espace/evaluation/executer', o.id_evaluation]);
  }
}
