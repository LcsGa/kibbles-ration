import { NgModelGroup } from '@angular/forms';
import { fromChildOutput } from '@lcsga/ng-operators';
import { Observable, startWith } from 'rxjs';

export const fromModelGroup = <T>(
  modelGroupSelector: () => NgModelGroup,
  { initialValue }: { initialValue: T }
): Observable<T> => {
  console.log('modelGroup', modelGroupSelector());
  return fromChildOutput(() => modelGroupSelector()?.control, 'valueChanges').pipe(startWith(initialValue));
};
