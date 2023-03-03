import { AbstractControl } from '@angular/forms';

export type FormRawValue<T extends AbstractControl> = ReturnType<T['getRawValue']>;
