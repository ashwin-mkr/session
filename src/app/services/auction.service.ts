import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface AuctionSession {
  sessionId: string;
  sessionName: string;
  type: 'increasing' | 'decreasing';
  duration: number;
  createdAt: string;
  status: 'active' | 'inactive' | 'ended';
  highestBet?: number;
  lowestBet?: number;
  participantCount?: number;
}

export interface Bet {
  ticketId: string;
  amount: number;
  timestamp?: string;
}

export interface BetResponse {
  ticketId: string;
  amount: number;
  sessionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuctionService {
  private readonly baseUrl = 'http://localhost:8081/api';
  
  // Reactive state
  private sessionsSubject = new BehaviorSubject<AuctionSession[]>([]);
  public sessions$ = this.sessionsSubject.asObservable();
  
  private currentSessionSubject = new BehaviorSubject<AuctionSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Session Management
  createSession(payload: {
    sessionId: string;
    type: 'increasing' | 'decreasing';
  }): Observable<{ sessionId: string }> {
    const endpoint = payload.type === 'decreasing' 
      ? `${this.baseUrl}/decrease-bets/session/activate/${payload.sessionId}`
      : `${this.baseUrl}/bets/session/activate/${payload.sessionId}`;
    
    return this.http.post<{ sessionId: string }>(endpoint, {});
  }

  getAllSessions(type: 'increasing' | 'decreasing'): Observable<AuctionSession[]> {
    const endpoint = type === 'decreasing'
      ? `${this.baseUrl}/decrease-bets/sessions/active`
      : `${this.baseUrl}/bets/sessions/active`;
    
    return this.http.get<AuctionSession[]>(endpoint);
  }

  getSession(sessionId: string, type: 'increasing' | 'decreasing'): Observable<AuctionSession> {
    const endpoint = type === 'decreasing'
      ? `${this.baseUrl}/decrease-bets/session/status/${sessionId}`
      : `${this.baseUrl}/bets/session/status/${sessionId}`;
    
    return this.http.get<AuctionSession>(endpoint);
  }

  stopSession(sessionId: string, type: 'increasing' | 'decreasing'): Observable<any> {
    const endpoint = type === 'decreasing'
      ? `${this.baseUrl}/decrease-bets/session/stop/${sessionId}`
      : `${this.baseUrl}/bets/session/stop/${sessionId}`;
    
    return this.http.post(endpoint, {});
  }

  // Betting
  placeBet(sessionId: string, bet: Bet, type: 'increasing' | 'decreasing'): Observable<BetResponse> {
    const endpoint = type === 'decreasing'
      ? `${this.baseUrl}/decrease-bets/place/${sessionId}`
      : `${this.baseUrl}/bets/place/${sessionId}`;
    
    return this.http.post<BetResponse>(endpoint, bet);
  }

  // Results
  getWinner(sessionId: string, type: 'increasing' | 'decreasing'): Observable<{ ticketId: string }> {
    const endpoint = type === 'decreasing'
      ? `${this.baseUrl}/decrease-bets/winner/${sessionId}`
      : `${this.baseUrl}/bets/winner/${sessionId}`;
    
    return this.http.get<{ ticketId: string }>(endpoint);
  }

  getHighestBet(sessionId: string): Observable<{ ticketId: string; amount: number }> {
    return this.http.get<{ ticketId: string; amount: number }>(
      `${this.baseUrl}/bets/highest/${sessionId}`
    );
  }

  getLowestBet(sessionId: string): Observable<{ ticketId: string; amount: number }> {
    return this.http.get<{ ticketId: string; amount: number }>(
      `${this.baseUrl}/decrease-bets/lowest/${sessionId}`
    );
  }

  getRemainingTime(sessionId: string, type: 'increasing' | 'decreasing'): Observable<{ remainingSeconds: number }> {
    return this.http.get<{ remainingSeconds: number }>(
      `${this.baseUrl}/session-time/remaining/${sessionId}`
    );
  }

  // State Management
  updateSessions(sessions: AuctionSession[]) {
    this.sessionsSubject.next(sessions);
  }

  setCurrentSession(session: AuctionSession | null) {
    this.currentSessionSubject.next(session);
  }
}