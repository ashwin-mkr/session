import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>🎯 Auction Hub</h1>
        <nav>
          <a routerLink="/create-session" routerLinkActive="active">Create Session</a>
          <a routerLink="/sessions" routerLinkActive="active">Live Sessions</a>
        </nav>
      </header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styleUrls: ['./app.scss']
})
export class App {
  title = 'Auction Hub';
}