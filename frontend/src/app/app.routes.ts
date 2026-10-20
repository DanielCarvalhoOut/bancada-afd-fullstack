import { Routes } from '@angular/router';
import { PortalComponent } from './features/portal/portal.component';
import { BancadaComponent } from './features/bancada/bancada.component';

export const routes: Routes = [
  { path: '', component: PortalComponent, title: 'Bancada de Autômatos' },
  { path: 'bancada', component: BancadaComponent, title: 'Bancada — AFD / AFN' },
  // lazy: o conteúdo do livro só é baixado quando alguém abre a Teoria
  { path: 'teoria', loadComponent: () => import('./features/teoria/teoria.component').then((m) => m.TeoriaComponent), title: 'Teoria' },
  { path: 'teoria/:sec', loadComponent: () => import('./features/teoria/teoria.component').then((m) => m.TeoriaComponent) },
  { path: 'derivacoes', loadComponent: () => import('./features/derivacoes/derivacoes.component').then((m) => m.DerivacoesComponent), title: 'Derivações e árvores' },
  { path: 'atividades', loadComponent: () => import('./features/atividades/atividades.component').then((m) => m.AtividadesComponent), title: 'Atividades' },
  { path: 'exercicios', loadComponent: () => import('./features/exercicios/exercicios.component').then((m) => m.ExerciciosComponent), title: 'Exercícios resolvidos' },
  { path: 'exercicios/:id', loadComponent: () => import('./features/exercicios/exercicios.component').then((m) => m.ExerciciosComponent) },
  { path: '**', redirectTo: '' },
];
