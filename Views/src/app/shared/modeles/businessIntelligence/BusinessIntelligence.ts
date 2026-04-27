export class BusinessIntelligence {
  id: number;
  nom: string;
  id_Site: number;
  id_Grille: number;

  constructor() {
    this.id = 0;
    this.nom = '';
    this.id_Site = 0;
    this.id_Grille = 0;
  }

  copy(): BusinessIntelligence {
    return Object.assign(new BusinessIntelligence(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.nom) {
      this.nom = data.nom;
    }
    if (data.id_Site) {
      this.id_Site = data.id_Site;
    }
    if (data.id_Grille) {
      this.id_Grille = data.id_Grille;
    }
  }
}
