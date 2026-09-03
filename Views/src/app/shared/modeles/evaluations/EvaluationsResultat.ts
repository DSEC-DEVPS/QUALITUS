export class EvaluationsResultat {
  id: number;
  etat: number;
  commentaire: string;
  id_Evaluations: number;
  constructor() {
    this.id = 0;
    this.etat = 0;
    this.commentaire = '';
    this.id_Evaluations = 0;
  }

  copy(): EvaluationsResultat {
    return Object.assign(new EvaluationsResultat(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.commentaire) {
      this.commentaire = data.commentaire;
    }
    if (data.etat) {
      this.etat = data.etat;
    }
    if (data.id_Evaluations) {
      this.id_Evaluations = data.id_Evaluations;
    }
  }
}
