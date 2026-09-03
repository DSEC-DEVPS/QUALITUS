export class Contexte {
  id: number;
  nom: string;
  description: string;
  etat: string;
  date_creation: Date | null;
  date_modification: Date | null;
  constructor() {
    this.id = 0;
    this.nom = '';
    this.description = '';
    this.etat = 'ACTIF';
    this.date_creation = null;
    this.date_modification = null;
  }

  copy(): Contexte {
    return Object.assign(new Contexte(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data?.nom) {
      this.nom = data.nom;
    }
    if (data?.description) {
      this.description = data.description;
    }
    if (data?.etat) {
      this.etat = data.etat;
    }
    if (data?.date_creation) {
      this.date_creation = data.date_creation;
    }
    if (data?.date_modification) {
      this.date_modification = data.date_modification;
    }
  }
}
