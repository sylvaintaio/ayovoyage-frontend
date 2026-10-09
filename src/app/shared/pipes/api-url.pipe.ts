import { Pipe, PipeTransform } from '@angular/core';

import { apiUrl } from '../../core/http/api-url';

/** Lien direct vers l'API dans un gabarit : `'/v1/tickets/' + id + '/pdf' | apiUrl`. */
@Pipe({ name: 'apiUrl' })
export class ApiUrlPipe implements PipeTransform {
  transform(path: string): string {
    return apiUrl(path);
  }
}
