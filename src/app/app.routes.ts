import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/create-session', pathMatch: 'full' },
  { 
    path: 'create-session', 
    loadComponent: () => import('./components/create-session/create-session.component').then(m => m.CreateSessionComponent)
  },
  { 
    path: 'sessions', 
    loadComponent: () => import('./components/session-list/session-list.component').then(m => m.SessionListComponent)
  },
  { 
    path: 'auction/:sessionId/:type', 
    loadComponent: () => import('./components/live-auction/live-auction.component').then(m => m.LiveAuctionComponent)
  }
];