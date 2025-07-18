import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@NgModule({
  declarations: [
    // Add components, pipes, directives here
    // ExampleComponent,
    // ExamplePipe,
    // ExampleDirective
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    // Re-export modules, components, pipes, directives that other modules will use
    // ExampleComponent,
    // ExamplePipe,
    // ExampleDirective
  ],
  providers: [
    // Add services that should be singletons across the app
  ]
})
export class SharedModule { }
