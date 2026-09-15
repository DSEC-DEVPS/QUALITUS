import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface MoisCalendrier {
  id: number;
  id_site: number;
  mois: number;
  libelle: string;
  annee: number;
  etat: string;
}
export interface CalendrierData {
  mois: MoisCalendrier[];
  politique: string | null;
}

@Injectable({ providedIn: 'root' })
export class EvalCalendrierService {
  private readonly http = inject(HttpClient);

  getSites(): Observable<{ id: number; nom: string }[]> {
    return this.http.get<{ id: number; nom: string }[]>(`/api/v1/site/all`);
  }
  getCalendrier(idSite: number): Observable<CalendrierData> {
    return this.http.get<CalendrierData>(`/api/v1/eval/calendrier/${idSite}`);
  }
  generer(idSite: number, annee?: number) {
    return this.http.post(`/api/v1/eval/calendrier/generer`, { id_site: idSite, annee });
  }
  setEtatMois(id: number, etat: string) {
    return this.http.put(`/api/v1/eval/calendrier/mois/${id}`, { etat });
  }
  setPolitique(idSite: number, politique: string) {
    return this.http.put(`/api/v1/eval/politique/${idSite}`, { politique });
  }
}
