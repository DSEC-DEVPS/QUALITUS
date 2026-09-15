import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Arborescence {
  id: number;
  id_grille: number;
  id_site: number;
  point_depart_libelle: string;
  grille?: string;
  site?: string;
}

export interface BiOption {
  id: number;
  id_parent: number | null;
  niveau: number;
  libelle: string;
  etat: string;
}

export interface ChoixBi {
  niveau: number;
  id_option: number | null;
  libelle: string;
}

export interface EvaluationBi {
  arborescence: Arborescence | null;
  choix: ChoixBi[];
  en_attente_validation: boolean;
  resolution: string | null;
}

export interface OptionEnAttente {
  id: number;
  niveau: number;
  libelle: string;
  id_evaluation_origine: number;
  grille: string;
  site: string;
  proposeur_nom: string;
  proposeur_prenom: string;
  parent_libelle: string | null;
  dateCreation: string;
}

@Injectable({ providedIn: 'root' })
export class EvalBiService {
  private readonly http = inject(HttpClient);

  // Arborescence (admin)
  getArborescences(params?: { id_grille?: number; id_site?: number }): Observable<Arborescence[]> {
    const qs = new URLSearchParams();
    if (params?.id_grille) qs.set('id_grille', String(params.id_grille));
    if (params?.id_site) qs.set('id_site', String(params.id_site));
    const s = qs.toString() ? `?${qs}` : '';
    return this.http.get<Arborescence[]>(`/api/v1/eval/bi/arborescence${s}`);
  }
  addArborescence(body: { id_grille: number; id_site: number; point_depart_libelle: string }) {
    return this.http.post<{ id: number }>(`/api/v1/eval/bi/arborescence`, body);
  }
  getArbreOptions(id: number): Observable<BiOption[]> {
    return this.http.get<BiOption[]>(`/api/v1/eval/bi/arborescence/${id}/options`);
  }
  addOption(body: { id_arborescence: number; id_parent: number | null; niveau: number; libelle: string }) {
    return this.http.post<{ id: number }>(`/api/v1/eval/bi/option`, body);
  }
  updateOption(id: number, libelle: string) {
    return this.http.put(`/api/v1/eval/bi/option/${id}`, { libelle });
  }
  deleteOption(id: number) {
    return this.http.delete(`/api/v1/eval/bi/option/${id}`);
  }

  // Usage pendant l'évaluation
  getEvaluationBi(idEval: number): Observable<EvaluationBi> {
    return this.http.get<EvaluationBi>(`/api/v1/eval/evaluation/${idEval}/bi`);
  }
  getOptionsEnfants(params: { id_arborescence: number; id_parent?: number | null; niveau: number; id_evaluation: number }): Observable<BiOption[]> {
    const qs = new URLSearchParams();
    qs.set('id_arborescence', String(params.id_arborescence));
    qs.set('niveau', String(params.niveau));
    qs.set('id_evaluation', String(params.id_evaluation));
    if (params.id_parent) qs.set('id_parent', String(params.id_parent));
    return this.http.get<BiOption[]>(`/api/v1/eval/bi/options-enfants?${qs}`);
  }
  saveEvaluationBi(idEval: number, choix: ChoixBi[]) {
    return this.http.post<{ statut: string }>(`/api/v1/eval/evaluation/${idEval}/bi`, { choix });
  }
  proposerOption(body: { id_arborescence: number; id_parent: number | null; niveau: number; libelle: string; id_evaluation: number }) {
    return this.http.post<{ id: number; etat: string }>(`/api/v1/eval/bi/proposer`, body);
  }

  // Validation
  getOptionsEnAttente(): Observable<OptionEnAttente[]> {
    return this.http.get<OptionEnAttente[]>(`/api/v1/eval/bi/options-en-attente`);
  }
  validerOption(id: number, libelle?: string) {
    return this.http.post(`/api/v1/eval/bi/option/${id}/valider`, libelle ? { libelle } : {});
  }
  rejeterOption(id: number, motif: string) {
    return this.http.post(`/api/v1/eval/bi/option/${id}/rejeter`, { motif });
  }
}
