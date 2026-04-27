export class BI2 {
  id: number;
  options: number;
  id_BI_1: number;

  constructor() {
    this.id = 0;
    this.options = 0;
    this.id_BI_1 = 0;
  }

  copy(): BI2 {
    return Object.assign(new BI2(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.options) {
      this.options = data.options;
    }
    if (data.id_BI_1) {
      this.id_BI_1 = data.id_BI_1;
    }
  }
}
