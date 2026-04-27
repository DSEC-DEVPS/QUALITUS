export class Evaluations {
  id: number;
  contexte: string;
  identifiant_appel: string;
  numero_case: string;
  numero_appel: string;
  date_appel: Date;
  date_evaluations: Date;
  date_creation: Date;
  dmt: string;
  motif_appel: string;
  id_Evaluateur: number;
  id_Agent: number;
  constructor() {
    this.id = 0;
    this.contexte = '';
    this.identifiant_appel = '';
    this.numero_case = '';
    this.numero_appel = '';
    this.date_appel = new Date();
    this.date_evaluations = new Date();
    this.date_creation = new Date();
    this.dmt = '';
    this.motif_appel = '';
    this.id_Evaluateur = 0;
    this.id_Agent = 0;
  }

  copy(): Evaluations {
    return Object.assign(new Evaluations(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.contexte) {
      this.contexte = data.contexte;
    }
    if (data.identifiant_appel) {
      this.identifiant_appel = data.identifiant_appel;
    }
    if (data.numero_case) {
      this.numero_case = data.numero_case;
    }
    if (data.numero_appel) {
      this.numero_appel = data.numero_appel;
    }
    if (data.date_appel) {
      this.date_appel = data.date_appel;
    }
    if (data.date_evaluations) {
      this.date_evaluations = data.date_evaluations;
    }
    if (data.date_creation) {
      this.date_creation = data.date_creation;
    }
    if (data.dmt) {
      this.dmt = data.dmt;
    }
    if (data.motif_appel) {
      this.motif_appel = data.motif_appel;
    }
    if (data.id_Evaluateur) {
      this.id_Evaluateur = parseInt(data.id_Evaluateur, 10);
    }
    if (data.id_Agent) {
      this.id_Agent = parseInt(data.id_Agent, 10);
    }
  }
}
