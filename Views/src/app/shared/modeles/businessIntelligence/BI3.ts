export class BI3 {
  id: number;
  options: number;
  id_BI_2: number;

  constructor() {
    this.id = 0;
    this.options = 0;
    this.id_BI_2 = 0;
  }

  copy(): BI3 {
    return Object.assign(new BI3(), this);
  }
  fromData(data: any) {
    this.id = parseInt(data.id, 10);
    if (data.options) {
      this.options = data.options;
    }
    if (data.id_BI_2) {
      this.id_BI_2 = data.id_BI_2;
    }
  }
}
