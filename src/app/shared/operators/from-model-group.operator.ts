import { NgModelGroup } from '@angular/forms';
import { fromChildOutput } from '@lcsga/ng-operators';
import { Observable, ObservableInput, shareReplay, startWith } from 'rxjs';

export const fromModelGroup = <T>(
  modelGroupSelector: () => NgModelGroup,
  { initialValue, buildNotifier }: { initialValue: T; buildNotifier?: ObservableInput<any> /* FIXME */ }
): Observable<T> => {
  return fromChildOutput(() => modelGroupSelector()?.control, 'valueChanges', { buildNotifier }).pipe(
    startWith(initialValue),
    shareReplay(1)
  );
};
