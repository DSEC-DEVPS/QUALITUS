export class CalendarsPolicies {
  id: number;
  mois_courant_et_posterieurs: number;
  mois_courant: number;
  tous_les_mois: number;
  id_Site: number;

  constructor() {
    this.id = 0;
    this.mois_courant_et_posterieurs = 0;
    this.mois_courant = 0;
    this.tous_les_mois = 0;
    this.id_Site = 0;
  }

  copy(): CalendarsPolicies {
    return Object.assign(new CalendarsPolicies(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.mois_courant_et_posterieurs) {
      this.mois_courant_et_posterieurs = data.mois_courant_et_posterieurs;
    }
    if (data.mois_courant) {
      this.mois_courant = data.mois_courant;
    }
    if (data.tous_les_mois) {
      this.tous_les_mois = data.tous_les_mois;
    }
    if (data.id_Site) {
      this.id_Site = parseInt(data.id_Site, 10);
    }
  }
}