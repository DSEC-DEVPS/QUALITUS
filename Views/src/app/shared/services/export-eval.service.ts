import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Type d'export Évaluation autorisé pour l'utilisateur connecté. */
export interface TypeExportEval {
  code: string;
  libelle: string;
  /** Vrai si l'export ne prend pas de période (ex. Liste des agents). */
  sans_dates: boolean;
}

/** Contexte de l'écran Exportations : types autorisés et périmètre de site. */
export interface ContexteExportEval {
  /** Site à vision globale (ex. DSFO) ou administrateur : choix du site. */
  vision_globale: boolean;
  id_site: number | null;
  sites: { id: number; nom: string }[];
  types: TypeExportEval[];
}

export interface DemandeExportEval {
  type: string;
  du?: string | null;
  au?: string | null;
  /** null = tous les sites (vision globale uniquement). */
  id_site?: number | null;
  /** Liste des agents : ACTIF | INACTIF | TOUS. */
  statut?: string;
}

export interface ResultatExportEval {
  type: string;
  libelle: string;
  feuilles: { nom: string; lignes: Record<string, unknown>[] }[];
}

@Injectable({ providedIn: 'root' })
export class ExportEvalService {
  private readonly http = inject(HttpClient);

  contexte(): Observable<ContexteExportEval> {
    return this.http.get<ContexteExportEval>('/api/v1/export/eval/contexte');
  }

  exporter(demande: DemandeExportEval): Observable<ResultatExportEval> {
    return this.http.post<ResultatExportEval>('/api/v1/export/eval', demande);
  }
}
