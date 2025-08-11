// live-auction.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BetPayload, Auctions } from '../auctions'; // updated import
import { interval, Subscription, timer } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-live-auction',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './live-auction.html',
  styleUrls: ['./live-auction.scss'] // <-- fixed
})
export class LiveAuction implements OnInit, OnDestroy {
  sessionId: string | null = null;
  type: 'increasing' | 'decreasing' | null = null;
  ticketId: string | null = null;
  debugMode = false // set to false in production
  countdown = 0;
  countdownSub?: Subscription;
  betAmount: number | null = null;
  allBets: { ticketId: string; amount: number }[] = [];

  spinning = false;
  rotation = 0;
  winner = '';

  // simple polling for bets (optional)
  betsPollSub?: Subscription;

  constructor(private route: ActivatedRoute, private auctionService: Auctions) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId');
    this.type = this.route.snapshot.paramMap.get('type') as 'increasing' | 'decreasing';
    this.ticketId = this.route.snapshot.queryParamMap.get('ticketId');

    if (!this.sessionId || !this.type || !this.ticketId) {
      console.error('Missing session or ticket information.');
      return;
    }

    console.log('Initializing LiveAuction with:', { sessionId: this.sessionId, type: this.type, ticketId: this.ticketId });
    this.fetchCountdown();
    this.startBetsPolling(); // optional: keep list fresh
    console.log('LiveAuction initialized successfully.');
  }

  fetchCountdown() {
    if (!this.sessionId || !this.type) return;
    this.auctionService.getRemainingTime(this.sessionId, this.type).subscribe({
      next: (res) => {
        this.countdown = res.remainingSeconds ?? 0;
        this.startCountdownTimer();
      },
      error: (err) => {
        console.error('Failed to get remaining time:', err);
      }
    });
  }

  startCountdownTimer() {
    this.countdownSub?.unsubscribe();
    // tick every second
    this.countdownSub = interval(1000).subscribe(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.countdownSub?.unsubscribe();
        // stop polling when auction ends
        this.betsPollSub?.unsubscribe();
        this.startSpinning();
        console.log('Auction ended, starting spinning...'); 
      }
    });
  }

  placeBet(): void {
    // validate: amount must be number and > 0
    if (this.betAmount == null || this.betAmount <= 0) {
      console.warn('Invalid bet amount. Must be > 0.');
      return;
    }
    if (!this.sessionId || !this.type || !this.ticketId) return;

    const payload: BetPayload = {
      ticketId: this.ticketId,
      amount: this.betAmount,
    };

    this.auctionService.placeBet(this.sessionId, payload, this.type).subscribe({
      next: (res) => {
        // assume backend returns the saved bet or success
        // push backend response if available, else fallback to payload
        const toPush = (res && (res.ticketId || res.amount)) ? res : payload;
        this.allBets.push({ ticketId: toPush.ticketId, amount: toPush.amount });
        this.betAmount = null;
      },
      error: (err) => {
        console.error('Bet failed:', err);
      }
    });
  }

  startSpinning(): void {
    if (this.allBets.length === 0) {
      this.getWinner(); // backend may choose default / no-bets case
      return;
    }
    this.spinning = true;
    // set rotation on the wheel element — add large base + randomness
    this.rotation = 3600 + Math.floor(Math.random() * 360);

    // allow CSS transition to play
    setTimeout(() => {
      this.spinning = false;
      this.getWinner();
    }, 4200);
  }

  getWinner(): void {
    if (!this.sessionId || !this.type) return;
    this.auctionService.getWinner(this.sessionId, this.type).subscribe({
      next: (res) => {
        this.winner = res.ticketId;
      },
      error: (err) => {
        console.error('Failed to fetch winner:', err);
        this.winner = 'Unknown';
      }
    });
  }

  startBetsPolling(intervalMs = 2000) {
    // Optional: polling to keep allBets fresh. Implement endpoint if your backend supports it.
    // Here I assume an endpoint exists: /api/bets/session/{sessionId}/all
    // If not, remove this function or replace with WebSocket.
    if (!this.sessionId || !this.type) return;
    // Uncomment and implement endpoint in service if you have it:
    // this.betsPollSub = interval(intervalMs).subscribe(() => {
    //   this.auctionService.getAllBets(this.sessionId, this.type).subscribe(bets => this.allBets = bets);
    // });
  }

  ngOnDestroy(): void {
    this.countdownSub?.unsubscribe();
    this.betsPollSub?.unsubscribe();
  }
}
