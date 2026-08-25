import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'categoryTranslator',
})
export class CategoryTranslatorPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
