import { NgModel } from '@angular/forms';
import { fromChildOutput } from '@lcsga/ng-operators';
import { Observable, startWith } from 'rxjs';

export const fromModel = <T>(modelSelector: () => NgModel, { initialValue }: { initialValue: T }): Observable<string> =>
  fromChildOutput(modelSelector, 'update').pipe(startWith(String(initialValue)));
