import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'home', loadComponent: () => import('./pages/home/containers/home.component').then((m) => m.HomeComponent) },
  {
    path: 'conferencia',
    loadComponent: () => import('./pages/conferencia/conferencia.component').then((m) => m.ConferenciaComponent),
  },
  {
    path: 'conferencia/:id',
    loadComponent: () =>
      import('./pages/conferencia/conferencia-detalhe.component').then((m) => m.ConferenciaDetalheComponent),
  },
  { path: 'estoque', loadComponent: () => import('./pages/estoque/estoque.component').then((m) => m.EstoqueComponent) },
  {
    path: 'documentos',
    loadComponent: () => import('./pages/documentos/documentos.component').then((m) => m.DocumentosComponent),
  },
  {
    path: 'escanear',
    loadComponent: () => import('./pages/escanear/containers/escanear.component').then((m) => m.EscanearComponent),
  },
  { path: 'reset', loadComponent: () => import('./pages/reset/reset.component').then((m) => m.ResetComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' },
];
