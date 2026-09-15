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
    // Conserve les permissions "legacy" (rôles menu.json) et ajoute les fines.
    const legacy = ['canAdd', 'canDelete', 'canEdit', 'canRead'];
    this.ngxPerms.addPermission([...legacy, ...this.set]);
  }

  can(code: string): boolean {
    if (this.admin) return true;
    return this.set.has((code || '').toLowerCase());
  }
  canAny(codes: string[]): boolean { return this.admin || codes.some(c => this.can(c)); }
  canAll(codes: string[]): boolean { return this.admin || codes.every(c => this.can(c)); }
  isAdmin(): boolean { return this.admin; }
}
