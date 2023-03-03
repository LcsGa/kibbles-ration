import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { TotalPipe } from './app/shared/pipes/total.pipe';

bootstrapApplication(AppComponent, { providers: [TotalPipe] });
