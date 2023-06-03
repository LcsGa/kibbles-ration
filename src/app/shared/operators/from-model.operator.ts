import { NgModel } from '@angular/forms';
import { fromChildOutput } from '@lcsga/ng-operators';
import { Observable, startWith } from 'rxjs';

export const fromModel = <T>(modelSelector: () => NgModel, { initialValue }: { initialValue: T }): Observable<T> =>
  fromChildOutput(modelSelector, 'update').pipe(startWith(initialValue));
