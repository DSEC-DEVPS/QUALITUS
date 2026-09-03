export class BI1 {
  id: number;
  options: number;
  id_Business_Intelligence: number;

  constructor() {
    this.id = 0;
    this.options = 0;
    this.id_Business_Intelligence = 0;
  }

  copy(): BI1 {
    return Object.assign(new BI1(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.options) {
      this.options = data.options;
    }
    if (data.id_Business_Intelligence) {
      this.id_Business_Intelligence = data.id_Business_Intelligence;
    }
  }
}
