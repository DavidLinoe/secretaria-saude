import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'home', loadComponent: () => import('./pages/home/containers/home.component').then((m) => m.HomeComponent) },
  {
    path: 'escanear',
    loadComponent: () => import('./pages/escanear/containers/escanear.component').then((m) => m.EscanearComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' },
];
