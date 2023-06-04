import { AsyncPipe, DecimalPipe, JsonPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  NgModel,
  NgModelGroup,
  Validators,
} from '@angular/forms';
import { RxEffects } from '@rx-angular/state/effects';
import { RxFor } from '@rx-angular/template/for';
import { RxIf } from '@rx-angular/template/if';
import { LetDirective } from '@rx-angular/template/let';
import { PushPipe } from '@rx-angular/template/push';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import {
  Observable,
  combineLatest,
  combineLatestWith,
  concatMap,
  delay,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  merge,
  pairwise,
  range,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';
import { fromModel, fromModelGroup, fromModelGroupArray } from './shared/operators';
import { TotalPipe } from './shared/pipes';
import { FormRawValue } from './shared/types';

interface DailyQuantityGroup {
  quantity: FormControl<number>;
  distribution: FormControl<number>;
}

type DailyQuantity = FormRawValue<FormGroup<DailyQuantityGroup>>;

interface KibblesRationGroup {
  splittingCount: FormControl<number>;
  splittings: FormArray<FormControl<number>>;
  dailyQuantities: FormArray<FormGroup<DailyQuantityGroup>>;
}

type KibblesRation = FormRawValue<FormGroup<KibblesRationGroup>>;

const createKibblesRation = (): Observable<KibblesRation> =>
  new Observable((destination) => {
    destination.next({
      splittingCount: 1,
      splittings: [1],
      dailyQuantities: [{ quantity: 100, distribution: 100 }],
    });
    destination.complete();
  });

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    CheckboxModule,
    DecimalPipe,
    FormsModule,
    InputNumberModule,
    JsonPipe,
    LetDirective,
    MessagesModule,
    PushPipe,
    RxFor,
    RxIf,
    TableModule,
    TotalPipe,
  ],
  providers: [RxEffects],
})
export class AppComponent {
  private readonly totalPipe = inject(TotalPipe);

  private readonly FORM_KEY = 'form';

  private readonly DEFAULT_KIBBLES_RATION: KibblesRation = {
    splittingCount: 1,
    splittings: [1],
    dailyQuantities: [{ quantity: 100, distribution: 100 }],
  };

  // @ViewChild('kibblesRation', { read: NgModelGroup })
  // private readonly kibblesRation!: NgModelGroup;
  // protected readonly kibblesRation$ = fromModelGroup(() => this.kibblesRation, {
  //   initialValue: this.DEFAULT_KIBBLES_RATION,
  // }).pipe(
  //   map((kibblesRation) => ({
  //     ...kibblesRation,
  //     splittings: new Array(kibblesRation.splittingCount).fill(null),
  //   }))
  // );

  @ViewChild('splittingCount', { read: NgModel })
  private readonly splittingCount!: NgModel;
  protected readonly splittingCount$ = fromModel(() => this.splittingCount, {
    initialValue: this.DEFAULT_KIBBLES_RATION.splittingCount,
  }).pipe(map(Number) /* FIXME => remap to original types */);

  @ViewChild('splittings', { read: NgModelGroup })
  private readonly splittings!: NgModelGroup;
  protected readonly splittings$ = this.splittingCount$.pipe(
    // take(1), // FIXME => responsible for the reset ! => use combineLatest instead?
    switchMap((count) =>
      fromModelGroupArray(() => this.splittings, {
        initialValue: new Array(count).fill(this.DEFAULT_KIBBLES_RATION.splittings[0]), // FIXME => should be fixed at the same time as the buildNotifier + FIXME => shouldn't reset the values !!
        buildNotifier: this.splittingCount$, // FIXME => should build only once here
      })
    )
  );

  @ViewChild('dailyQuantities', { read: NgModelGroup })
  private readonly dailyQuantities!: NgModelGroup;
  protected readonly dailyQuantities$ = fromModelGroupArray(() => this.dailyQuantities, {
    initialValue: this.DEFAULT_KIBBLES_RATION.dailyQuantities,
  });

  protected readonly kibblesRation$ = combineLatest({
    splittingCount: this.splittingCount$,
    splittings: this.splittings$,
    dailyQuantities: this.dailyQuantities$,
  });

  protected readonly formGroup = this.createInitialFormGroup();

  // private readonly saveFormValues$ = this.formGroup.valueChanges.pipe(
  //   map((formValues) => JSON.stringify(formValues)),
  //   tap((formValuesJSON) => localStorage.setItem(this.FORM_KEY, formValuesJSON)),
  //   ignoreElements()
  // );

  protected readonly displaySplittings$ = this.splittingCount$.pipe(map((splittingCount) => splittingCount > 1));

  // private readonly updateSplittings$ = this.formGroup.controls.splittingCount.valueChanges.pipe(
  //   startWith(this.formGroup.getRawValue().splittingCount),
  //   pairwise(),
  //   concatMap(([prevCount, currCount]) =>
  //     range(Math.abs(currCount - prevCount)).pipe(
  //       tap(() => {
  //         if (currCount > prevCount) {
  //           this.formGroup.controls.splittings.push(this.createSplittingControl(1));
  //         } else {
  //           this.formGroup.controls.splittings.removeAt(currCount - 1);
  //         }
  //       })
  //     )
  //   ),
  //   ignoreElements()
  // );

  // protected readonly splittedDailyQuantities$ = this.formGroup.valueChanges.pipe(
  //   startWith(this.formGroup.getRawValue()),
  //   map(({ splittings, dailyQuantities }) => {
  //     return splittings!.reduce(
  //       (acc, splittingAmount) => [
  //         ...acc,
  //         dailyQuantities!.map(
  //           ({ quantity, distribution }) =>
  //             quantity! * (distribution! / 100) * (splittingAmount / this.totalPipe.transform(splittings!))
  //         ),
  //       ],
  //       [] as number[][]
  //     );
  //   })
  // );

  // protected readonly displayDailyQuantitiesDistributionError$ =
  //   this.formGroup.controls.dailyQuantities.valueChanges.pipe(
  //     startWith(this.formGroup.getRawValue().dailyQuantities),
  //     map((dailyQuantities): number[] => dailyQuantities.map(({ distribution }) => distribution!)),
  //     map(this.totalPipe.transform.bind(this)),
  //     map((total) => total > 100)
  //   );

  // private readonly updateDailyQuantitiesDistribution$ = this.formGroup.controls.dailyQuantities.valueChanges.pipe(
  //   map(({ length }) => length),
  //   startWith(this.formGroup.getRawValue().dailyQuantities.length),
  //   distinctUntilChanged(),
  //   filter((length) => length === 2),
  //   map(() => this.formGroup.controls.dailyQuantities.controls.map(({ controls }) => controls.distribution)),
  //   switchMap(([distribution1, distribution2]) =>
  //     merge(
  //       distribution1.valueChanges.pipe(tap((value) => distribution2.setValue(100 - value, { emitEvent: false }))),
  //       distribution2.valueChanges.pipe(tap((value) => distribution1.setValue(100 - value, { emitEvent: false })))
  //     )
  //   ),
  //   ignoreElements()
  // );

  // protected readonly displayResetButton$ = this.formGroup.valueChanges.pipe(
  //   startWith(this.formGroup.getRawValue()),
  //   map((formGroup) => JSON.stringify(formGroup) !== JSON.stringify(this.DEFAULT_KIBBLES_RATION))
  // );

  constructor() {
    const effects = inject(RxEffects);
    // effects.register(this.saveFormValues$);
    // effects.register(this.updateSplittings$);
    // effects.register(this.updateDailyQuantitiesDistribution$);

    this.splittingCount$
      .pipe(
        filter((count) => count > 1),
        delay(0)
      )
      .subscribe(() => console.log(this.splittings));
  }

  private createInitialFormGroup(): any {
    // const { splittingCount, splittings, dailyQuantities } = JSON.parse(
    //   localStorage.getItem(this.FORM_KEY) ?? JSON.stringify(this.DEFAULT_KIBBLES_RATION)
    // ) as KibblesRation;
    // return this.fb.nonNullable.group<KibblesRationGroup>({
    //   splittingCount: this.fb.nonNullable.control(splittingCount ?? 1, Validators.required),
    //   splittings: this.fb.array(splittings.map(this.createSplittingControl.bind(this))),
    //   dailyQuantities: this.fb.array(dailyQuantities.map(this.createDailyQuantityGroup.bind(this))),
    // });
  }

  // formGroup.reset({ ... }) not working with formArrays
  protected resetFormGroup(): void {
    this.formGroup.controls.splittingCount.setValue(1);

    [this.formGroup.controls.splittings, this.formGroup.controls.dailyQuantities].forEach((control) =>
      control.clear({ emitEvent: false })
    );

    this.formGroup.controls.splittings.push(this.createSplittingControl());
    this.formGroup.controls.dailyQuantities.push(this.createDailyQuantityGroup());
  }

  private createSplittingControl(splitting: number = this.DEFAULT_KIBBLES_RATION.splittings[0]): any {
    // return this.fb.nonNullable.control(splitting, { validators: Validators.required });
  }

  protected createDailyQuantityGroup(
    { quantity, distribution }: DailyQuantity = this.DEFAULT_KIBBLES_RATION.dailyQuantities[0]
  ): any {
    // return this.fb.nonNullable.group({
    //   quantity: this.fb.nonNullable.control(quantity, { validators: Validators.required }),
    //   distribution: this.fb.nonNullable.control(distribution, { validators: Validators.required }),
    // });
  }

  protected removeDailyQuantityAt(index: number): void {
    this.formGroup.controls.dailyQuantities.removeAt(index);
  }

  protected addDailyQuantity(): void {
    this.formGroup.controls.dailyQuantities.push(this.createDailyQuantityGroup());
    if (this.formGroup.controls.dailyQuantities.length === 2) {
      this.formGroup.controls.dailyQuantities.controls[1].controls.distribution.setValue(
        100 - this.formGroup.getRawValue().dailyQuantities[0].distribution
      );
    }
  }

  protected trackByIndex(index: number): number {
    return index;
  }
}
