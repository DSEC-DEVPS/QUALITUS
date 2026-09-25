import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NgxPermissionsService } from 'ngx-permissions';

export interface MesPermissions {
  role: string;
  permissions: string[];
  admin: boolean;
}

/**
 * Socle commun S5 — permissions effectives de l'utilisateur courant.
 * Alimenté par GET /me/permissions (rôle + droits complémentaires calculés
 * côté serveur). Sert au guardage de l'UI (directive *appCan, guards de route)
 * et alimente ngx-permissions pour *ngxPermissionsOnly.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly ngxPerms = inject(NgxPermissionsService);

  private set = new Set<string>();
  private admin = false;
  private readonly _perms$ = new BehaviorSubject<string[]>([]);
  /** Émis à chaque (re)chargement des permissions. */
  readonly permissions$ = this._perms$.asObservable();

  /** Charge les permissions effectives depuis le backend. */
  load(): Observable<MesPermissions | null> {
    return this.http.get<MesPermissions>('/api/v1/me/permissions').pipe(
      tap(r => this.apply(r)),
      catchError(() => of(null))
    );
  }

  private apply(r: MesPermissions): void {
    this.admin = !!r.admin;
    this.set = new Set((r.permissions || []).map(c => c.toLowerCase()));
    this._perms$.next(Array.from(this.set));
    // Permission synthétique par MODULE : présente dès que l'utilisateur possède
    // au moins une permission de ce module (ex. "evaluation" si evaluation.lire).
    // Sert au gating du menu (voir un menu = avoir ≥1 permission du module).
    this.modules = new Set<string>();
    this.set.forEach(code => {
      const mod = code.split('.')[0];
      if (mod) this.modules.add(mod);
    });
    if (this.admin) {
      // l'admin voit tout : on ajoute tous les modules connus + ceux du set
      ['utilisateur', 'site', 'programme', 'fonction', 'fiche', 'sondage', 'quiz', 'grille',
       'referentiel', 'evaluation', 'contre_evaluation', 'calibrage', 'notification',
       'habilitation', 'agent_pole', 'reporting', 'bi', 'validation_option',
       'arbre_coaching', 'calendrier', 'creation_masse'].forEach(m => this.modules.add(m));
    }
    // Permissions synthétiques de GESTION : présentes seulement si l'utilisateur
    // possède lire+creer+modifier+supprimer d'un module (ET). Gèrent l'accès aux
    // sous-menus d'administration (ex. gestion des quiz / sondages).
    const synth = new Set<string>();
    const gestion = (mod: string) => ['lire', 'creer', 'modifier', 'supprimer']
      .every(a => this.admin || this.set.has(`${mod}.${a}`));
    if (gestion('quiz')) synth.add('quiz.gestion');
    if (gestion('sondage')) synth.add('sondage.gestion');
    // Contre-évaluation : la « gestion » (accès au sous-menu Contre-évaluation)
    // exige les 4 permissions ; contre_evaluation.lire seul ne donne accès qu'à
    // « Mes contre-évaluations ».
    if (gestion('contre_evaluation')) synth.add('contre_evaluation.gestion');
    // Référentiel : le menu « Référentiels » exige les 4 permissions ;
    // referentiel.lire seul ne suffit pas.
    if (gestion('referentiel')) synth.add('referentiel.gestion');
    // Grille : le menu « Grilles d'évaluation » exige les 4 permissions ;
    // grille.lire seul ne suffit pas.
    if (gestion('grille')) synth.add('grille.gestion');
    // BI : le sous-menu « Arborescences BI » exige les 4 permissions ;
    // bi.lire seul ne suffit pas.
    if (gestion('bi')) synth.add('bi.gestion');
    // Validation d'options : le sous-menu exige les 4 permissions ;
    // validation_option.lire seul ne suffit pas.
    if (gestion('validation_option')) synth.add('validation_option.gestion');
    // Arbre de coaching : le sous-menu exige les 4 permissions.
    if (gestion('arbre_coaching')) synth.add('arbre_coaching.gestion');
    // Périodes / Calendrier : le sous-menu exige les 4 permissions.
    if (gestion('calendrier')) synth.add('calendrier.gestion');
    // Création en masse : le sous-menu exige les 4 permissions.
    if (gestion('creation_masse')) synth.add('creation_masse.gestion');
    // Habilitation : le menu « Habilitations » exige lire ET gerer
    // (ce module n'a que ces deux permissions, pas le quadruplet standard).
    if (this.admin || (this.set.has('habilitation.lire') && this.set.has('habilitation.gerer'))) {
      synth.add('habilitation.gestion');
    }
    // Permission synthétique de RÔLE : superviseur. Certains sous-menus (Quiz en
    // échecs / Quiz en retest) sont réservés aux superviseurs, quel que soit leur
    // niveau de permissions. L'admin (super-utilisateur) y a également accès.
    this.superviseur = this.admin || ['R_SUP', 'R_SUPE'].includes((r.role || '').toUpperCase());
    if (this.superviseur) synth.add('est_superviseur');
    // Conserve les permissions "legacy" (rôles menu.json) et ajoute les fines + modules + synthétiques.
    const legacy = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    this.ngxPerms.addPermission([...legacy, ...this.set, ...this.modules, ...synth]);
  }

  private modules = new Set<string>();
  private superviseur = false;

  /** Vrai si l'utilisateur est superviseur (ou admin). */
  isSuperviseur(): boolean { return this.superviseur; }

  can(code: string): boolean {
    if (this.admin) return true;
    return this.set.has((code || '').toLowerCase());
  }
  /** Vrai si l'utilisateur possède au moins une permission du module donné. */
  canModule(module: string): boolean {
    return this.admin || this.modules.has((module || '').toLowerCase());
  }
  canAny(codes: string[]): boolean { return this.admin || codes.some(c => this.can(c)); }
  canAll(codes: string[]): boolean { return this.admin || codes.every(c => this.can(c)); }
  isAdmin(): boolean { return this.admin; }
}
