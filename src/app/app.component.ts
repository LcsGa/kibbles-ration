import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RxEffects } from '@rx-angular/state/effects';
import { RxFor } from '@rx-angular/template/for';
import { RxIf } from '@rx-angular/template/if';
import { PushPipe } from '@rx-angular/template/push';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  merge,
  pairwise,
  range,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
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
    RxFor,
    RxIf,
    InputNumberModule,
    MessagesModule,
    PushPipe,
    ReactiveFormsModule,
    TableModule,
    TotalPipe,
  ],
  providers: [RxEffects],
})
export class AppComponent {
  private readonly FORM_KEY = 'form';

  private readonly DEFAULT_KIBBLES_RATION: KibblesRation = {
    splittingCount: 1,
    splittings: [1],
    dailyQuantities: [{ quantity: 100, distribution: 100 }],
  };

  protected readonly formGroup = this.createInitialFormGroup();

  private readonly saveFormValues$ = this.formGroup.valueChanges.pipe(
    map((formValues) => JSON.stringify(formValues)),
    tap((formValuesJSON) => localStorage.setItem(this.FORM_KEY, formValuesJSON)),
    ignoreElements()
  );

  protected readonly displaySplittings$ = this.formGroup.controls.splittingCount.valueChanges.pipe(
    startWith(this.formGroup.getRawValue().splittingCount),
    map((splittingCount) => splittingCount > 1)
  );

  private readonly updateSplittings$ = this.formGroup.controls.splittingCount.valueChanges.pipe(
    startWith(this.formGroup.getRawValue().splittingCount),
    pairwise(),
    concatMap(([prevCount, currCount]) =>
      range(Math.abs(currCount - prevCount)).pipe(
        tap(() => {
          if (currCount > prevCount) {
            this.formGroup.controls.splittings.push(this.createSplittingControl(1));
          } else {
            this.formGroup.controls.splittings.removeAt(currCount - 1);
          }
        })
      )
    ),
    ignoreElements()
  );

  protected readonly splittedDailyQuantities$ = this.formGroup.valueChanges.pipe(
    startWith(this.formGroup.getRawValue()),
    map(({ splittings, dailyQuantities }) => {
      return splittings!.reduce(
        (acc, splittingAmount) => [
          ...acc,
          dailyQuantities!.map(
            ({ quantity, distribution }) =>
              quantity! * (distribution! / 100) * (splittingAmount / this.totalPipe.transform(splittings!))
          ),
        ],
        [] as number[][]
      );
    })
  );

  protected readonly displayDailyQuantitiesDistributionError$ =
    this.formGroup.controls.dailyQuantities.valueChanges.pipe(
      startWith(this.formGroup.getRawValue().dailyQuantities),
      map((dailyQuantities): number[] => dailyQuantities.map(({ distribution }) => distribution!)),
      map(this.totalPipe.transform.bind(this)),
      map((total) => total > 100)
    );

  private readonly updateDailyQuantitiesDistribution$ = this.formGroup.controls.dailyQuantities.valueChanges.pipe(
    map(({ length }) => length),
    startWith(this.formGroup.getRawValue().dailyQuantities.length),
    distinctUntilChanged(),
    filter((length) => length === 2),
    map(() => this.formGroup.controls.dailyQuantities.controls.map(({ controls }) => controls.distribution)),
    switchMap(([distribution1, distribution2]) =>
      merge(
        distribution1.valueChanges.pipe(tap((value) => distribution2.setValue(100 - value, { emitEvent: false }))),
        distribution2.valueChanges.pipe(tap((value) => distribution1.setValue(100 - value, { emitEvent: false })))
      )
    ),
    ignoreElements()
  );

  protected readonly displayResetButton$ = this.formGroup.valueChanges.pipe(
    startWith(this.formGroup.getRawValue()),
    map((formGroup) => JSON.stringify(formGroup) !== JSON.stringify(this.DEFAULT_KIBBLES_RATION))
  );

  constructor(private readonly fb: FormBuilder, private readonly totalPipe: TotalPipe, effects: RxEffects) {
    effects.register(this.saveFormValues$);
    effects.register(this.updateSplittings$);
    effects.register(this.updateDailyQuantitiesDistribution$);
  }

  private createInitialFormGroup(): FormGroup<KibblesRationGroup> {
    const { splittingCount, splittings, dailyQuantities } = JSON.parse(
      localStorage.getItem(this.FORM_KEY) ?? JSON.stringify(this.DEFAULT_KIBBLES_RATION)
    ) as KibblesRation;

    return this.fb.nonNullable.group<KibblesRationGroup>({
      splittingCount: this.fb.nonNullable.control(splittingCount ?? 1, Validators.required),
      splittings: this.fb.array(splittings.map(this.createSplittingControl.bind(this))),
      dailyQuantities: this.fb.array(dailyQuantities.map(this.createDailyQuantityGroup.bind(this))),
    });
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

  private createSplittingControl(splitting: number = this.DEFAULT_KIBBLES_RATION.splittings[0]): FormControl<number> {
    return this.fb.nonNullable.control(splitting, { validators: Validators.required });
  }

  protected createDailyQuantityGroup(
    { quantity, distribution }: DailyQuantity = this.DEFAULT_KIBBLES_RATION.dailyQuantities[0]
  ): FormGroup<DailyQuantityGroup> {
    return this.fb.nonNullable.group({
      quantity: this.fb.nonNullable.control(quantity, { validators: Validators.required }),
      distribution: this.fb.nonNullable.control(distribution, { validators: Validators.required }),
    });
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
