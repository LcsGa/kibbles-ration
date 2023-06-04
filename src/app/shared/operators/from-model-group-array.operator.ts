import { NgModelGroup } from '@angular/forms';
import { ObservableInput, map, shareReplay } from 'rxjs';
import { fromModelGroup } from './from-model-group.operator';

export const fromModelGroupArray = <T>(
  modelGroupSelector: () => NgModelGroup,
  { initialValue, buildNotifier }: { initialValue: T; buildNotifier?: ObservableInput<any> /* FIXME */ }
) =>
  fromModelGroup<T>(modelGroupSelector, { initialValue, buildNotifier }).pipe(
    map((group): T => Object.values(group as object) as T), // FIXME => handle more complex group types like ojbects for exambles (not only basic primitives)
    shareReplay(1)
  );
