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

export interface UserLite { id: number; nom: string; prenom: string; nom_utilisateur?: string; role: string | null; fonction?: string; }
export interface UtilisateurSpecial extends UserLite { nb_grant: number; nb_deny: number; }
export interface PageSpeciaux { items: UtilisateurSpecial[]; total: number; page: number; taille: number; }
export interface DroitItem { id: number; module: string; action: string; code: string; libelle: string; parRole: boolean; sens: 'GRANT' | 'DENY' | null; effectif: boolean; }
export interface DroitsUtilisateur { utilisateur: UserLite; admin: boolean; permissions: DroitItem[]; }

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
  getObservations(): Observable<Observation[]> { return this.http.get<Observation[]>(`${this.base}/observations`); }

  // Droits complémentaires par utilisateur
  rechercherUtilisateurs(q: string): Observable<UserLite[]> {
    return this.http.get<UserLite[]>(`${this.base}/utilisateurs`, { params: { q: q || '' } });
  }
  getUtilisateursSpeciaux(opts: { page?: number; taille?: number; role?: string; q?: string } = {}): Observable<PageSpeciaux> {
    const params: any = {};
    if (opts.page) params.page = String(opts.page);
    if (opts.taille) params.taille = String(opts.taille);
    if (opts.role) params.role = opts.role;
    if (opts.q) params.q = opts.q;
    return this.http.get<PageSpeciaux>(`${this.base}/utilisateurs-speciaux`, { params });
  }
  getDroitsUtilisateur(id: number): Observable<DroitsUtilisateur> {
    return this.http.get<DroitsUtilisateur>(`${this.base}/utilisateur/${id}/droits`);
  }
  setDroit(id: number, idPermission: number, sens: 'GRANT' | 'DENY' | 'NONE') {
    return this.http.put(`${this.base}/utilisateur/${id}/permission/${idPermission}`, { sens });
  }
}
