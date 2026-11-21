import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Permission { id: number; module: string; action: string; code: string; libelle: string; etat: string; }
export interface Role { id: number; code: string; libelle: string; etat?: string; nb_permissions?: number; }
export interface Matrice {
  roles: { id: number; code: string; libelle: string }[];
  permissions: Permission[];
  grid: { [idRole: number]: { [idPerm: number]: boolean } };
}
export interface Observation { permission: string; role_code: string | null; occurrences: number; derniere: string; }

export interface UserLite {
  id: number; nom: string; prenom: string; nom_utilisateur?: string; role: string | null; fonction?: string;
  site?: string | null; role_libelle?: string | null; status?: string;
}
/** Dérogation individuelle (droit en plus / en moins), éventuellement motivée et temporaire. */
export interface Derogation {
  id_permission: number; code: string; module: string; libelle: string; sens: 'GRANT' | 'DENY';
  motif: string | null; date_fin: string | null; expiree: boolean; date_maj: string | null; auteur: string | null;
}
export interface UtilisateurSpecial extends UserLite { nb_grant: number; nb_deny: number; nb_expirees: number; derogations: Derogation[]; }
export interface PageSpeciaux {
  items: UtilisateurSpecial[]; total: number; page: number; taille: number;
  compteurs: { utilisateurs: number; plus: number; moins: number; expirees: number };
}
export interface DroitItem {
  id: number; module: string; action: string; code: string; libelle: string; parRole: boolean;
  sens: 'GRANT' | 'DENY' | null; effectif: boolean; expiree: boolean;
  motif: string | null; date_fin: string | null; auteur: string | null; date_maj: string | null;
}
export interface ResumeDroits {
  plus: number; moins: number; expirees: number; effectifs: number; total: number;
  derniere: { auteur: string | null; date: string } | null;
}
export interface DroitsUtilisateur { utilisateur: UserLite; admin: boolean; resume: ResumeDroits; permissions: DroitItem[]; }
export interface FiltresSpeciaux {
  page?: number; taille?: number; role?: string; q?: string; site?: number; type?: 'plus' | 'moins' | 'expirees';
  permission?: string; module?: string; export?: boolean;
}
export type Sens = 'GRANT' | 'DENY' | 'NONE';
export interface OptionsDerogation { motif?: string | null; date_fin?: string | null; }

@Injectable({ providedIn: 'root' })
export class HabilitationService {
  private readonly http = inject(HttpClient);
  private base = '/api/v1/habilitations';

  getMatrice(): Observable<Matrice> { return this.http.get<Matrice>(`${this.base}/matrice`); }
  getRoles(): Observable<Role[]> { return this.http.get<Role[]>(`${this.base}/roles`); }
  getPermissions(): Observable<Permission[]> { return this.http.get<Permission[]>(`${this.base}/permissions`); }
  getMode(): Observable<{ mode: string }> { return this.http.get<{ mode: string }>(`${this.base}/mode`); }
  setMode(mode: string) { return this.http.put(`${this.base}/mode`, { mode }); }
  toggle(idRole: number, idPermission: number, actif: boolean) {
    return this.http.put(`${this.base}/role/${idRole}/permission/${idPermission}`, { actif });
  }
  /** Coche / décoche tout un module pour un rôle ; renvoie le nombre de cases modifiées. */
  setModuleRole(idRole: number, module: string, actif: boolean): Observable<{ modifiees: number }> {
    return this.http.put<{ modifiees: number }>(`${this.base}/role/${idRole}/module/${encodeURIComponent(module)}`, { actif });
  }
  getObservations(): Observable<Observation[]> { return this.http.get<Observation[]>(`${this.base}/observations`); }
  getSites(): Observable<{ id: number; nom: string }[]> { return this.http.get<{ id: number; nom: string }[]>(`${this.base}/sites`); }

  // Droits complémentaires par utilisateur
  rechercherUtilisateurs(q: string): Observable<UserLite[]> {
    return this.http.get<UserLite[]>(`${this.base}/utilisateurs`, { params: { q: q || '' } });
  }
  getUtilisateursSpeciaux(opts: FiltresSpeciaux = {}): Observable<PageSpeciaux> {
    const params: Record<string, string> = {};
    if (opts.page) params['page'] = String(opts.page);
    if (opts.taille) params['taille'] = String(opts.taille);
    if (opts.role) params['role'] = opts.role;
    if (opts.q) params['q'] = opts.q;
    if (opts.site) params['site'] = String(opts.site);
    if (opts.type) params['type'] = opts.type;
    if (opts.permission) params['permission'] = opts.permission;
    if (opts.module) params['module'] = opts.module;
    if (opts.export) params['export'] = '1';
    return this.http.get<PageSpeciaux>(`${this.base}/utilisateurs-speciaux`, { params });
  }
  getDroitsUtilisateur(id: number): Observable<DroitsUtilisateur> {
    return this.http.get<DroitsUtilisateur>(`${this.base}/utilisateur/${id}/droits`);
  }
  setDroit(id: number, idPermission: number, sens: Sens, opts: OptionsDerogation = {}) {
    return this.http.put(`${this.base}/utilisateur/${id}/permission/${idPermission}`, { sens, ...opts });
  }
  setModuleUtilisateur(id: number, module: string, sens: Sens, opts: OptionsDerogation = {}): Observable<{ modifiees: number }> {
    return this.http.put<{ modifiees: number }>(`${this.base}/utilisateur/${id}/module/${encodeURIComponent(module)}`, { sens, ...opts });
  }
  resetDroits(id: number): Observable<{ supprimees: number }> {
    return this.http.delete<{ supprimees: number }>(`${this.base}/utilisateur/${id}/derogations`);
  }
}
