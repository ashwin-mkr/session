import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuctionService, Bet } from '../../services/auction.service';
import { interval, Subscription } from 'rxjs';

interface BetWithTimestamp extends Bet {
  timestamp: string;
}

@Component({
  selector: 'app-live-auction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-auction.component.html',
  styleUrls: ['./live-auction.component.scss']
})
export class LiveAuctionComponent implements OnInit, OnDestroy {
  sessionId = signal<string>('');
  auctionType = signal<'increasing' | 'decreasing'>('increasing');
  ticketId = signal<string>('');
  
  countdown = signal<number>(0);
  betAmount = signal<number | null>(null);
  allBets = signal<BetWithTimestamp[]>([]);
  currentBet = signal<{ ticketId: string; amount: number } | null>(null);
  winner = signal<string>('');
  
  isPlacingBet = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  
  // Wheel animation
  wheelRotation = signal<number>(0);
  isSpinning = signal<boolean>(false);
  
  private countdownSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  // Computed properties
  isAuctionActive = computed(() => this.countdown() > 0);
  formattedCountdown = computed(() => {
    const seconds = this.countdown();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auctionService: AuctionService
  ) {}

  ngOnInit() {
    // Get route parameters
    this.sessionId.set(this.route.snapshot.paramMap.get('sessionId') || '');
    this.auctionType.set(this.route.snapshot.paramMap.get('type') as 'increasing' | 'decreasing' || 'increasing');
    this.ticketId.set(this.route.snapshot.queryParamMap.get('ticketId') || '');

    if (!this.sessionId() || !this.ticketId()) {
      this.errorMessage.set('Missing session or ticket information');
      return;
    }

    this.initializeAuction();
  }

  ngOnDestroy() {
    this.countdownSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
  }

  private initializeAuction() {
    this.fetchRemainingTime();
    this.fetchCurrentBet();
    this.startRefreshTimer();
  }

  private fetchRemainingTime() {
    this.auctionService.getRemainingTime(this.sessionId(), this.auctionType()).subscribe({
      next: (response) => {
        this.countdown.set(response.remainingSeconds);
        this.startCountdown();
      },
      error: (error) => {
        console.error('Failed to fetch remaining time:', error);
        this.errorMessage.set('Failed to get auction time information');
      }
    });
  }

  private fetchCurrentBet() {
    const service = this.auctionType() === 'increasing' 
      ? this.auctionService.getHighestBet(this.sessionId())
      : this.auctionService.getLowestBet(this.sessionId());

    service.subscribe({
      next: (bet) => {
        this.currentBet.set(bet);
      },
      error: (error) => {
        console.error('Failed to fetch current bet:', error);
      }
    });
  }

  private startCountdown() {
    this.countdownSubscription?.unsubscribe();
    
    this.countdownSubscription = interval(1000).subscribe(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        this.countdownSubscription?.unsubscribe();
        this.refreshSubscription?.unsubscribe();
        this.onAuctionEnd();
      }
    });
  }

  private startRefreshTimer() {
    this.refreshSubscription = interval(3000).subscribe(() => {
      if (this.isAuctionActive()) {
        this.fetchCurrentBet();
      }
    });
  }

  placeBet() {
    const amount = this.betAmount();
    if (!amount || amount <= 0) {
      this.errorMessage.set('Please enter a valid bet amount');
      return;
    }

    if (!this.isAuctionActive()) {
      this.errorMessage.set('Auction has ended');
      return;
    }

    this.isPlacingBet.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const bet: Bet = {
      ticketId: this.ticketId(),
      amount: amount
    };

    this.auctionService.placeBet(this.sessionId(), bet, this.auctionType()).subscribe({
      next: (response) => {
        this.isPlacingBet.set(false);
        this.successMessage.set(`Bet placed successfully: ₹${response.amount}`);
        this.betAmount.set(null);
        
        // Add bet to local list
        const newBet: BetWithTimestamp = {
          ...response,
          timestamp: new Date().toLocaleTimeString()
        };
        this.allBets.update(bets => [...bets, newBet]);
        
        // Refresh current bet
        this.fetchCurrentBet();
        
        // Clear success message after 3 seconds
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.isPlacingBet.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to place bet');
      }
    });
  }

  private onAuctionEnd() {
    this.startWheelSpin();
    this.fetchWinner();
  }

  private startWheelSpin() {
    if (this.allBets().length === 0) return;
    
    this.isSpinning.set(true);
    const finalRotation = 1800 + Math.random() * 360; // 5 full rotations + random
    this.wheelRotation.set(finalRotation);
    
    setTimeout(() => {
      this.isSpinning.set(false);
    }, 4000);
  }

  private fetchWinner() {
    setTimeout(() => {
      this.auctionService.getWinner(this.sessionId(), this.auctionType()).subscribe({
        next: (response) => {
          this.winner.set(response.ticketId);
        },
        error: (error) => {
          console.error('Failed to fetch winner:', error);
          this.winner.set('Unable to determine winner');
        }
      });
    }, 4500); // Wait for wheel animation to complete
  }

  goBack() {
    this.router.navigate(['/sessions']);
  }

  getBetValidationMessage(): string {
    const amount = this.betAmount();
    const current = this.currentBet();
    
    if (!amount) return '';
    
    if (this.auctionType() === 'increasing' && current && amount <= current.amount) {
      return `Bid must be higher than ₹${current.amount}`;
    }
    
    if (this.auctionType() === 'decreasing' && current && amount >= current.amount) {
      return `Bid must be lower than ₹${current.amount}`;
    }
    
    return '';
  }

  isBetValid(): boolean {
    const amount = this.betAmount();
    if (!amount || amount <= 0) return false;
    
    const current = this.currentBet();
    if (!current) return true;
    
    if (this.auctionType() === 'increasing') {
      return amount > current.amount;
    } else {
      return amount < current.amount;
    }
  }
}