export class BI4 {
  id: number;
  options: number;
  id_BI_3: number;

  constructor() {
    this.id = 0;
    this.options = 0;
    this.id_BI_3 = 0;
  }

  copy(): BI4 {
    return Object.assign(new BI4(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.options) {
      this.options = data.options;
    }
    if (data.id_BI_3) {
      this.id_BI_3 = data.id_BI_3;
    }
  }
}
