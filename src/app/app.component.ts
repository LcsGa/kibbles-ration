import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { PushModule } from '@rx-angular/template/push';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import { map, pairwise, startWith, tap } from 'rxjs';
import { TotalPipe } from './shared/pipes/total.pipe';

interface DailyQuantityGroup {
  quantity: FormControl<number>;
  distribution: FormControl<number>;
}

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
  protected readonly formGroup = this.fb.nonNullable.group({
    splittingCount: [1, Validators.required],
    splittings: this.fb.array([this.splittingControl]),
    dailyQuantities: this.fb.array([this.dailyQuantityGroup]),
  });

  protected readonly displaySplittings$ = this.formGroup.controls.splittingCount.valueChanges.pipe(
    map((splittingCount) => splittingCount > 1)
  );

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
      map((dailyQuantities): number[] => dailyQuantities.map(({ distribution }) => distribution!)),
      map(this.totalPipe.transform.bind(this)),
      map((total) => total > 100)
    );

  constructor(private readonly fb: FormBuilder, private readonly totalPipe: TotalPipe) {
    this.updateSplittings$.subscribe();
  }

  private get splittingControl(): FormControl<number> {
    return this.fb.nonNullable.control(1, { validators: Validators.required });
  }

  protected get dailyQuantityGroup(): FormGroup<DailyQuantityGroup> {
    return this.fb.nonNullable.group({
      quantity: this.fb.nonNullable.control(100, { validators: Validators.required }),
      distribution: this.fb.nonNullable.control(100, { validators: Validators.required }),
    });
  }

  protected trackById(index: number): number {
    return index;
  }
}
