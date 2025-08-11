import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Auctions {
  sessionId: string;
  sessionName: string;
  type: 'increasing' | 'decreasing';
  duration: number;
  createdAt: string;
  highestBet?: number;
  lowestBet?: number;
  ticketIds?: string[];
    status?: string; // ✅ Add this line if status is optional

}
export interface AuctionSession  {
  sessionId: string;
  type: 'increasing' | 'decreasing';
  status?: string;
}


export interface BetPayload {
  ticketId: string;
  amount: number;
}

@Injectable({
  providedIn: 'root',
})
export class Auctions {
 private increaseBaseUrl = 'http://192.168.0.133:8081/api/bets';
  private decreaseBaseUrl = 'http://192.168.0.133:8081/api/decrease-bets';

  constructor(private http: HttpClient) {}

  /** 🔵 Start a new session based on type */
  createSession(payload: {
    sessionId: string;
    type: 'increasing' | 'decreasing';
  }): Observable<{ sessionId: string }> {
    const url =
      payload.type === 'decreasing'
        ? `${this.decreaseBaseUrl}/session/activate/${payload.sessionId}`
        : `${this.increaseBaseUrl}/session/activate/${payload.sessionId}`;

    return this.http.post<{ sessionId: string }>(url, {}); // backend does not expect a body
  }

  /** 🟢 Place a bet */
  placeBet(
    sessionId: string,
    betPayload: BetPayload,
    sessionType: 'increasing' | 'decreasing'
  ): Observable<any> {
    const url =
      sessionType === 'decreasing'
        ? `${this.decreaseBaseUrl}/place/${sessionId}`
        : `${this.increaseBaseUrl}/place/${sessionId}`;

    return this.http.post(url, betPayload);
  }

  /** 🔴 Stop a session */
  stopSession(sessionId: string, type: 'increasing' | 'decreasing'): Observable<any> {
    const baseUrl = type === 'decreasing' ? this.decreaseBaseUrl : this.increaseBaseUrl;
    return this.http.post(`${baseUrl}/session/stop/${sessionId}`, {});
  }

  /** 🏆 Get winner */
  getWinner(sessionId: string, type: 'increasing' | 'decreasing'): Observable<{ ticketId: string }> {
    const baseUrl = type === 'decreasing' ? this.decreaseBaseUrl : this.increaseBaseUrl;
    return this.http.get<{ ticketId: string }>(`${baseUrl}/winner/${sessionId}`);
  }

  /** 🔍 Get session status by ID */
  getSession(sessionId: string, type: 'increasing' | 'decreasing'): Observable<Auctions> {
    const baseUrl = type === 'decreasing' ? this.decreaseBaseUrl : this.increaseBaseUrl;
    return this.http.get<Auctions>(`${baseUrl}/session/status/${sessionId}`);
  }

  /** 🔺 Get highest bet (only for increasing) */
  getHighestBet(sessionId: string): Observable<{ ticketId: string; amount: number }> {
    return this.http.get<{ ticketId: string; amount: number }>(
      `${this.increaseBaseUrl}/highest/${sessionId}`
    );
  }

  /** 🔻 Get lowest bet (only for decreasing) */
  getLowestBet(sessionId: string): Observable<{ ticketId: string; amount: number }> {
    return this.http.get<{ ticketId: string; amount: number }>(
      `${this.decreaseBaseUrl}/lowest/${sessionId}`
    );
  }

  /** ⏳ Get remaining time for session (if backend supports it) */
  getRemainingTime(sessionId: string, type: 'increasing' | 'decreasing'): Observable<{ remainingSeconds: number }> {
    const baseUrl = type === 'decreasing' ? this.decreaseBaseUrl : this.increaseBaseUrl;
    return this.http.get<{ remainingSeconds: number }>(`${baseUrl}/session-time/remaining/${sessionId}`);
  }

  /** 📋 Get all active sessions */
  getAllSessions(type: 'increasing' | 'decreasing'): Observable<Auctions[]> {
    const baseUrl = type === 'decreasing' ? this.decreaseBaseUrl : this.increaseBaseUrl;
    // console.log(`Fetching ${type} sessions from ${baseUrl}`);
    return this.http.get<Auctions[]>(`${baseUrl}/sessions/active`);
  }
}