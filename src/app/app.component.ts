import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ignoreElements, map, pairwise, startWith, tap } from 'rxjs';

interface DailyQuantityGroup {
  quantity: FormControl<number>;
  distribution: FormControl<number>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ButtonModule, CheckboxModule, CommonModule, InputNumberModule, ReactiveFormsModule, TableModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly formGroup = this.fb.nonNullable.group({
    splittingCount: [1, Validators.required],
    customDistribution: [false],
    splittings: this.fb.array([this.splittingControl]),
    dailyQuantities: this.fb.array([this.dailyQuantityGroup]),
  });

  private readonly updateSplittings$ = this.formGroup.controls.splittingCount.valueChanges.pipe(
    startWith(this.formGroup.getRawValue().splittingCount),
    pairwise(),
    tap(([prevCount, currCount]) => {
      if (currCount > prevCount) {
        this.formGroup.controls.splittings.push(this.splittingControl);
      } else {
        this.formGroup.controls.splittings.removeAt(this.formGroup.getRawValue().splittingCount - 1);
      }
    })
  );

  private readonly updateSplittingsState$ = this.formGroup.controls.customDistribution.valueChanges.pipe(
    startWith(this.formGroup.value.customDistribution),
    tap((customDistribution) => {
      this.formGroup.controls.splittings[customDistribution ? 'enable' : 'disable']();
      this.formGroup.controls.splittings.controls.forEach((control) => control.setValue(1));
    }),
    ignoreElements()
  );

  protected readonly splittedDailyQuantities$ = this.formGroup.valueChanges.pipe(
    startWith(this.formGroup.getRawValue()),
    map(({ dailyQuantities }) => {
      return this.formGroup.controls.splittings
        .getRawValue()
        .reduce(
          (acc, splittingAmount) => [
            ...acc,
            dailyQuantities!.map(
              ({ quantity, distribution }) =>
                quantity! *
                (distribution! / 100) *
                (splittingAmount /
                  this.formGroup
                    .getRawValue()
                    .splittings.reduce((total, splittingAmount) => total + splittingAmount, 0))
            ),
          ],
          [] as number[][]
        );
    })
  );

  constructor(private readonly fb: FormBuilder) {
    this.updateSplittings$.subscribe();
    this.updateSplittingsState$.subscribe();
  }

  private get splittingControl(): FormControl<number> {
    return this.fb.nonNullable.control(
      { value: 1, disabled: !this.formGroup?.getRawValue().customDistribution ?? true },
      { validators: Validators.required }
    );
  }

  private get dailyQuantityGroup(): FormGroup<DailyQuantityGroup> {
    return this.fb.nonNullable.group({
      quantity: this.fb.nonNullable.control(100, { validators: Validators.required }),
      distribution: this.fb.nonNullable.control(100, { validators: Validators.required }),
    });
  }

  protected removeDailyQuantityAt(index: number): void {
    this.formGroup.controls.dailyQuantities.removeAt(index);
  }

  protected addDailyQuantity(): void {
    this.formGroup.controls.dailyQuantities.push(this.dailyQuantityGroup);
  }
}
