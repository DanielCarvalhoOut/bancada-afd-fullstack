import { Routes } from '@angular/router';
import { PortalComponent } from './features/portal/portal.component';
import { BancadaComponent } from './features/bancada/bancada.component';

export const routes: Routes = [
  { path: '', component: PortalComponent, title: 'Bancada de Autômatos' },
  { path: 'bancada', component: BancadaComponent, title: 'Bancada — AFD / AFN' },
  { path: '**', redirectTo: '' },
];
