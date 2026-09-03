export class SupplementairesResultat {
  id: number;
  etat: number;
  commentaire: string;
  id_Supplementaires: number;
  constructor() {
    this.id = 0;
    this.etat = 0;
    this.commentaire = '';
    this.id_Supplementaires = 0;
  }

  copy(): SupplementairesResultat {
    return Object.assign(new SupplementairesResultat(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.commentaire) {
      this.commentaire = data.commentaire;
    }
    if (data.etat) {
      this.etat = data.etat;
    }
    if (data.id_Supplementaires) {
      this.id_Supplementaires = data.id_Supplementaires;
    }
  }
}
