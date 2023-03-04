import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { PushModule } from '@rx-angular/template/push';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import { concatMap, ignoreElements, map, pairwise, range, startWith, tap } from 'rxjs';
import { TotalPipe } from './shared/pipes/total.pipe';
import { FormRawValue } from './shared/types/form.type';

interface DailyQuantityGroup {
  quantity: FormControl<number>;
  distribution: FormControl<number>;
}

type DailyQuantity = FormRawValue<FormGroup<DailyQuantityGroup>>;

interface KribbleRationGroup {
  splittingCount: FormControl<number>;
  splittings: FormArray<FormControl<number>>;
  dailyQuantities: FormArray<FormGroup<DailyQuantityGroup>>;
}

type KribbleRation = FormRawValue<FormGroup<KribbleRationGroup>>;

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    CheckboxModule,
    CommonModule,
    ForModule,
    IfModule,
    InputNumberModule,
    MessagesModule,
    PushModule,
    ReactiveFormsModule,
    TableModule,
    TotalPipe,
  ],
})
export class AppComponent {
  private readonly FORM_KEY = 'form';

  private readonly DEFAULT_KRIBBLE_RATION: KribbleRation = {
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

  protected readonly displayResetButton$ = this.formGroup.valueChanges.pipe(
    startWith(this.formGroup.getRawValue()),
    map((formGroup) => JSON.stringify(formGroup) !== JSON.stringify(this.DEFAULT_KRIBBLE_RATION))
  );

  constructor(private readonly fb: FormBuilder, private readonly totalPipe: TotalPipe) {
    this.saveFormValues$.subscribe();
    this.updateSplittings$.subscribe();
  }

  private createInitialFormGroup(): FormGroup<KribbleRationGroup> {
    const { splittingCount, splittings, dailyQuantities } = JSON.parse(
      localStorage.getItem(this.FORM_KEY) ?? JSON.stringify(this.DEFAULT_KRIBBLE_RATION)
    ) as KribbleRation;

    return this.fb.nonNullable.group<KribbleRationGroup>({
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

  private createSplittingControl(splitting: number = this.DEFAULT_KRIBBLE_RATION.splittings[0]): FormControl<number> {
    return this.fb.nonNullable.control(splitting, { validators: Validators.required });
  }

  protected createDailyQuantityGroup(
    { quantity, distribution }: DailyQuantity = this.DEFAULT_KRIBBLE_RATION.dailyQuantities[0]
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
  }

  protected trackById(index: number): number {
    return index;
  }
}
