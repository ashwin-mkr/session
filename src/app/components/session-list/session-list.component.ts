import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuctionService, AuctionSession } from '../../services/auction.service';
import { interval, Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.scss']
})
export class SessionListComponent implements OnInit, OnDestroy {
  sessions = signal<AuctionSession[]>([]);
  ticketIds: { [sessionId: string]: string } = {};
  isLoading = signal(true);
  errorMessage = signal('');
  
  private refreshSubscription?: Subscription;

  constructor(
    private auctionService: AuctionService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSessions();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  loadSessions() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    // Load both increasing and decreasing sessions
    forkJoin({
      increasing: this.auctionService.getAllSessions('increasing'),
      decreasing: this.auctionService.getAllSessions('decreasing')
    }).subscribe({
      next: (result) => {
        const increasingSessions = result.increasing.map(s => ({ ...s, type: 'increasing' as const }));
        const decreasingSessions = result.decreasing.map(s => ({ ...s, type: 'decreasing' as const }));
        
        const allSessions = [...increasingSessions, ...decreasingSessions];
        
        // Remove duplicates based on sessionId
        const uniqueSessions = allSessions.filter((session, index, self) =>
          index === self.findIndex(s => s.sessionId === session.sessionId)
        );
        
        this.sessions.set(uniqueSessions);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load sessions. Please try again.');
        this.isLoading.set(false);
        console.error('Error loading sessions:', error);
      }
    });
  }

  joinSession(session: AuctionSession) {
    const ticketId = this.ticketIds[session.sessionId];
    
    if (!ticketId || ticketId.trim() === '') {
      alert('Please enter a valid Ticket ID');
      return;
    }

    this.router.navigate(['/auction', session.sessionId, session.type], {
      queryParams: { ticketId: ticketId.trim() }
    });
  }

  private startAutoRefresh() {
    // Refresh sessions every 5 seconds
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.loadSessions();
    });
  }

  getSessionTypeIcon(type: string): string {
    return type === 'increasing' ? '📈' : '📉';
  }

  getSessionTypeLabel(type: string): string {
    return type === 'increasing' ? 'Highest Bid Wins' : 'Lowest Bid Wins';
  }

  isTicketIdValid(sessionId: string): boolean {
    const ticketId = this.ticketIds[sessionId];
    return ticketId && ticketId.trim().length > 0;
  }
}