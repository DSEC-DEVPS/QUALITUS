import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { normaliserRecherche } from '@shared/utils/recherche';

/** Option d'un arbre (BI ou coaching). */
export interface OptionArbre {
  id: number;
  id_parent: number | null;
  niveau: number;
  libelle: string;
}
export interface LigneArbre {
  o: OptionArbre;
  profondeur: number;
  nbEnfants: number;
  nbDescendantes: number;
  ouvert: boolean;
  /** Découpage du libellé pour surligner la recherche. */
  avant: string; trouve: string; apres: string;
}
export interface DemandeAjout { id_parent: number | null; niveau: number; libelle: string; }
export interface DemandeDeplacement { option: OptionArbre; parent: OptionArbre | null; nbDescendantes: number; }

/**
 * Arbre dépliable commun aux écrans « Arborescences BI » et « Arbre de coaching » :
 * sélection en cascade d'une branche (N1, puis une de ses sous-options, etc.) sur
 * laquelle se concentrent l'affichage et la recherche ; recherche (déplie les branches trouvées), ajout d'une sous-option, renommage,
 * suppression et déplacement par glisser-déposer (HTML5 natif, sans dépendance).
 * Le composant ne fait aucun appel : il émet les demandes, l'écran les exécute
 * puis lui renvoie la liste à jour.
 */
@Component({
  selector: 'app-arbre-options',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './arbre-options.component.html',
  styleUrl: './arbre-options.component.scss',
})
export class ArbreOptionsComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() options: OptionArbre[] = [];
  @Input() modifiable = false;
  @Input() niveauMax = 5;
  @Output() ajouter = new EventEmitter<DemandeAjout>();
  @Output() renommer = new EventEmitter<{ id: number; libelle: string }>();
  @Output() supprimer = new EventEmitter<{ option: OptionArbre; nbDescendantes: number }>();
  @Output() deplacer = new EventEmitter<DemandeDeplacement>();

  recherche = '';
  /** Sélection en cascade : ids choisis du niveau 1 au niveau n (la dernière = branche affichée). */
  selection: number[] = [];
  /** Recherche dans la liste déroulante de chaque niveau de la cascade. */
  rechercheNiveau: string[] = [];
  lignes: LigneArbre[] = [];
  nbResultats = 0;
  /** Branches ouvertes (conservées entre deux rechargements). */
  private ouverts = new Set<number>();
  private enfants = new Map<number | null, OptionArbre[]>();
  private parId = new Map<number, OptionArbre>();
  private descendantes = new Map<number, number>();
  private profondeurSous = new Map<number, number>();

  // édition en ligne
  editionId: number | null = null;
  editionTexte = '';
  /** Parent sous lequel on ajoute (null = racine), undefined = aucun ajout en cours. */
  ajoutParent: number | null | undefined = undefined;
  ajoutTexte = '';

  // glisser-déposer
  glisseId: number | null = null;
  cibleId: number | 'racine' | null = null;

  ngOnChanges(): void {
    this.indexer();
    this.validerSelection();
    this.calculer();
  }

  // ---------- sélection en cascade ----------
  /** Option sur laquelle se concentrent l'arbre et la recherche (null = tout l'arbre). */
  get focus(): OptionArbre | null {
    const id = this.selection[this.selection.length - 1];
    return id !== undefined ? this.parId.get(id) || null : null;
  }
  /** Chemin de la branche sélectionnée (fil d'Ariane). */
  get chemin(): OptionArbre[] {
    return this.selection.map(id => this.parId.get(id)).filter((o): o is OptionArbre => !!o);
  }
  /** Listes à afficher : niveau 1, puis les sous-options de chaque option choisie. */
  get niveauxCascade(): number[] {
    const n: number[] = [0];
    for (let i = 0; i < this.selection.length; i++) {
      if ((this.enfants.get(this.selection[i]) || []).length && i + 1 < this.niveauMax) n.push(i + 1);
    }
    return n;
  }
  valeurNiveau(i: number): number | null { return i < this.selection.length ? this.selection[i] : null; }
  choixNiveau(i: number): OptionArbre[] {
    const liste = this.enfants.get(i === 0 ? null : this.selection[i - 1]) || [];
    const q = normaliserRecherche((this.rechercheNiveau[i] || '').trim());
    return q ? liste.filter(o => o.id === this.selection[i] || normaliserRecherche(o.libelle).includes(q)) : liste;
  }
  choisir(i: number, id: number | null): void {
    this.selection = this.selection.slice(0, i);
    if (id !== null && id !== undefined) this.selection.push(id);
    this.rechercheNiveau = this.rechercheNiveau.slice(0, i + 1);
    if (id) this.ouverts.add(id);
    this.calculer();
  }
  effacerSelection(): void { this.selection = []; this.rechercheNiveau = []; this.calculer(); }
  ouvertureListe(ouvert: boolean, i: number, champ: HTMLInputElement): void {
    if (ouvert) setTimeout(() => champ.focus()); else { this.rechercheNiveau[i] = ''; this.cdr.markForCheck(); }
  }
  /** Après un rechargement : on garde la sélection tant que chaque option reste la fille de la précédente. */
  private validerSelection(): void {
    const ok: number[] = [];
    for (const id of this.selection) {
      const o = this.parId.get(id);
      const parentAttendu = ok.length ? ok[ok.length - 1] : null;
      if (!o || (o.id_parent && this.parId.has(o.id_parent) ? o.id_parent : null) !== parentAttendu) break;
      ok.push(id);
    }
    this.selection = ok;
  }

  // ---------- construction ----------
  private indexer(): void {
    this.enfants.clear(); this.parId.clear(); this.descendantes.clear(); this.profondeurSous.clear();
    for (const o of this.options) this.parId.set(o.id, o);
    for (const o of this.options) {
      const p = o.id_parent && this.parId.has(o.id_parent) ? o.id_parent : null;
      if (!this.enfants.has(p)) this.enfants.set(p, []);
      this.enfants.get(p)!.push(o);
    }
    for (const l of this.enfants.values()) l.sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
    const compter = (id: number): [number, number] => {
      let n = 0, prof = 0;
      for (const e of this.enfants.get(id) || []) {
        const [ne, pe] = compter(e.id);
        n += 1 + ne; prof = Math.max(prof, 1 + pe);
      }
      this.descendantes.set(id, n); this.profondeurSous.set(id, prof);
      return [n, prof];
    };
    for (const r of this.enfants.get(null) || []) compter(r.id);
  }

  /** Lignes visibles : arbre déplié, ou résultats de recherche avec leurs parents. */
  calculer(): void {
    const q = normaliserRecherche(this.recherche.trim());
    const focus = this.focus;
    // périmètre de recherche : tout l'arbre, ou les sous-options de la branche choisie
    const perimetre = new Set<number>();
    if (focus) {
      const pile = [...(this.enfants.get(focus.id) || [])];
      while (pile.length) { const o = pile.pop()!; perimetre.add(o.id); pile.push(...(this.enfants.get(o.id) || [])); }
    }
    const visibles = new Set<number>();
    const ouvertsRecherche = new Set<number>();
    this.nbResultats = 0;
    if (q) {
      for (const o of this.options) {
        if (focus && !perimetre.has(o.id)) continue;
        if (normaliserRecherche(o.libelle).includes(q)) {
          this.nbResultats++;
          visibles.add(o.id);
          let p = o.id_parent ? this.parId.get(o.id_parent) : undefined;
          while (p) { visibles.add(p.id); ouvertsRecherche.add(p.id); p = p.id_parent ? this.parId.get(p.id_parent) : undefined; }
        }
      }
    }
    const lignes: LigneArbre[] = [];
    const ligne = (o: OptionArbre, profondeur: number, ouvert: boolean): LigneArbre => ({
      o, profondeur, nbEnfants: (this.enfants.get(o.id) || []).length, nbDescendantes: this.descendantes.get(o.id) || 0,
      ouvert, ...this.decouper(o.libelle, q),
    });
    const parcourir = (parent: number | null, profondeur: number) => {
      for (const o of this.enfants.get(parent) || []) {
        if (q && !visibles.has(o.id)) continue;
        const ouvert = q ? ouvertsRecherche.has(o.id) : this.ouverts.has(o.id);
        lignes.push(ligne(o, profondeur, ouvert));
        if (ouvert) parcourir(o.id, profondeur + 1);
      }
    };
    if (focus) {
      // la branche choisie en tête (toujours ouverte), puis son contenu
      lignes.push({ ...ligne(focus, 0, true), avant: focus.libelle, trouve: '', apres: '' });
      parcourir(focus.id, 1);
    } else {
      parcourir(null, 0);
    }
    this.lignes = lignes;
    this.cdr.markForCheck();
  }

  private decouper(libelle: string, q: string): { avant: string; trouve: string; apres: string } {
    if (!q) return { avant: libelle, trouve: '', apres: '' };
    // normaliserRecherche conserve la longueur des caractères latins usuels (é -> e)
    const n = normaliserRecherche(libelle);
    const i = n.length === libelle.length ? n.indexOf(q) : -1;
    if (i < 0) return { avant: libelle, trouve: '', apres: '' };
    return { avant: libelle.slice(0, i), trouve: libelle.slice(i, i + q.length), apres: libelle.slice(i + q.length) };
  }

  // ---------- dépliage ----------
  basculer(l: LigneArbre): void {
    if (!l.nbEnfants || this.recherche.trim() || l.o.id === this.focus?.id) return;
    if (this.ouverts.has(l.o.id)) this.ouverts.delete(l.o.id); else this.ouverts.add(l.o.id);
    this.calculer();
  }
  toutDeplier(): void { this.options.forEach(o => this.ouverts.add(o.id)); this.calculer(); }
  /** Ajout depuis le bas de l'arbre : sous la branche choisie, sinon au niveau 1. */
  ouvrirAjoutBas(): void { this.ouvrirAjout(this.focus); }
  toutReplier(): void { this.ouverts.clear(); this.calculer(); }
  viderRecherche(): void { this.recherche = ''; this.calculer(); }

  // ---------- ajout ----------
  ouvrirAjout(parent: OptionArbre | null): void {
    this.annulerEdition();
    this.ajoutParent = parent ? parent.id : null;
    this.ajoutTexte = '';
    if (parent) { this.ouverts.add(parent.id); this.calculer(); }
    this.focaliser('.saisie-ajout input');
  }
  validerAjout(): void {
    const libelle = this.ajoutTexte.trim();
    if (!libelle || this.ajoutParent === undefined) return;
    const parent = this.ajoutParent === null ? null : this.parId.get(this.ajoutParent) || null;
    this.ajouter.emit({ id_parent: parent ? parent.id : null, niveau: parent ? parent.niveau + 1 : 1, libelle });
    this.ajoutTexte = '';
    this.focaliser('.saisie-ajout input');
  }
  annulerAjout(): void { this.ajoutParent = undefined; this.ajoutTexte = ''; }

  // ---------- renommage ----------
  ouvrirEdition(o: OptionArbre): void {
    this.annulerAjout();
    this.editionId = o.id; this.editionTexte = o.libelle;
    this.focaliser('.saisie-edition input');
  }
  validerEdition(): void {
    const o = this.editionId !== null ? this.parId.get(this.editionId) : undefined;
    const libelle = this.editionTexte.trim();
    if (o && libelle && libelle !== o.libelle) this.renommer.emit({ id: o.id, libelle });
    this.annulerEdition();
  }
  annulerEdition(): void { this.editionId = null; this.editionTexte = ''; }

  demanderSuppression(l: LigneArbre): void { this.supprimer.emit({ option: l.o, nbDescendantes: l.nbDescendantes }); }

  // ---------- glisser-déposer ----------
  /** Cible valide : ni l'option elle-même, ni une descendante, ni trop profonde, ni son parent actuel. */
  peutDeposer(cible: OptionArbre | null): boolean {
    const g = this.glisseId !== null ? this.parId.get(this.glisseId) : undefined;
    if (!g) return false;
    if (cible === null) return g.id_parent !== null;
    if (cible.id === g.id || cible.id === g.id_parent) return false;
    for (let p: OptionArbre | undefined = cible; p; p = p.id_parent ? this.parId.get(p.id_parent) : undefined) {
      if (p.id === g.id) return false;
    }
    return cible.niveau + 1 + (this.profondeurSous.get(g.id) || 0) <= this.niveauMax;
  }
  debutGlisser(ev: DragEvent, l: LigneArbre): void {
    if (!this.modifiable) return;
    ev.dataTransfer?.setData('text/plain', String(l.o.id));
    // état appliqué après le démarrage : modifier le DOM pendant dragstart annule le glisser dans Chrome
    setTimeout(() => { this.glisseId = l.o.id; this.cdr.markForCheck(); });
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
  }
  survol(ev: DragEvent, cible: OptionArbre | null): void {
    if (!this.peutDeposer(cible)) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.cibleId = cible ? cible.id : 'racine';
  }
  quitter(cible: OptionArbre | null): void {
    if (this.cibleId === (cible ? cible.id : 'racine')) this.cibleId = null;
  }
  deposer(ev: DragEvent, cible: OptionArbre | null): void {
    ev.preventDefault();
    const g = this.glisseId !== null ? this.parId.get(this.glisseId) : undefined;
    const ok = this.peutDeposer(cible);
    this.finGlisser();
    if (!g || !ok) return;
    if (cible) this.ouverts.add(cible.id);
    this.deplacer.emit({ option: g, parent: cible, nbDescendantes: this.descendantes.get(g.id) || 0 });
  }
  finGlisser(): void { this.glisseId = null; this.cibleId = null; this.cdr.markForCheck(); }

  private focaliser(selecteur: string): void {
    this.cdr.markForCheck();
    setTimeout(() => (document.querySelector(selecteur) as HTMLInputElement | null)?.focus());
  }
  trackLigne = (_: number, l: LigneArbre) => l.o.id;
}
