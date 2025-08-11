import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auctions, AuctionSession  } from '../auctions';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './session-list.html',
  styleUrl: './session-list.scss'
})
export class SessionList implements OnInit {
  sessions: Auctions[] = [];
  ticketIds: { [sessionId: string]: string } = {};

  constructor(private svc: Auctions, private router: Router) {}

ngOnInit(): void {
  this.svc.getAllSessions('increasing').subscribe((increasingSessions) => {
    this.svc.getAllSessions('decreasing').subscribe((decreasingSessions) => {
      const combinedSessions = [...increasingSessions, ...decreasingSessions];

      // 🔥 Remove duplicates based on sessionId
      const uniqueSessionsMap = new Map();
      for (const session of combinedSessions) {
        // Assuming `type` is known from where it came
        if (!session.type) {
          session.type = increasingSessions.includes(session) ? 'increasing' : 'decreasing';
        }
        uniqueSessionsMap.set(session.sessionId, session);
      }

      this.sessions = Array.from(uniqueSessionsMap.values());
      console.log('All unique sessions:', this.sessions);
    });
  });
}

  join(session: Auctions) {
  const ticketId = this.ticketIds[session.sessionId];
  if (ticketId && session.sessionId && session.type) {
this.router.navigate(['/LiveAuction', session.sessionId, session.type], {
  queryParams: { ticketId }
});


  } else {
    console.error('Invalid session data or missing ticketId:', session);
  }
}

}



// this.router.navigate(['/LiveAuction'], {
//   queryParams: {
//     sessionId: session.sessionId,
//     type: session.type,
//     ticketId: session.ticketId
//   }
// });






