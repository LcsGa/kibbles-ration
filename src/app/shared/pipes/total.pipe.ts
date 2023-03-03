import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'total', standalone: true })
export class TotalPipe implements PipeTransform {
  public transform(numbers: number[]): number {
    return numbers.reduce((total, nb) => total + nb, 0);
  }
}
