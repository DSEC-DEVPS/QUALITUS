import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lowercaseAll',
  standalone: true,
})
export class LowercaseAllPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value.toLowerCase();
  }
}
