import { Routes } from '@angular/router';
import { StartSession } from './start-session/start-session';
import { SessionList } from './session-list/session-list';
import { LiveAuction } from './live-auction/live-auction';

export const routes: Routes = [
  { path: '', redirectTo: '/StartSession', pathMatch: 'full' },
  { path: 'StartSession', component: StartSession },
  { path: 'SessionList', component: SessionList },
  { path: 'LiveAuction/:sessionId/:type', component: LiveAuction }
];
