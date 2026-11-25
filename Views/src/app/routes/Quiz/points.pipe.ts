import { Pipe, PipeTransform } from '@angular/core';
import { fmtPoints } from './bareme';

/** Points d'un quiz à la française, 2 décimales au plus : 5, 12,5, 33,33 (out116). */
@Pipe({ name: 'points', standalone: true })
export class PointsPipe implements PipeTransform {
  transform(v: number | string | null | undefined): string { return fmtPoints(v); }
}
