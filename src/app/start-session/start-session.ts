import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule,  FormBuilder,FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auctions } from '../auctions';


@Component({
  selector: 'app-start-session',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './start-session.html',
  styleUrl: './start-session.scss'
})
export class StartSession {
  form: FormGroup;
  isStarting = false;
  sessionStarted = false;
  sessionId: string | null = null;


  constructor(private fb: FormBuilder, private router: Router, private svc: Auctions,private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      sessionId: ['', Validators.required],
      type: ['', Validators.required],
    });
  }


  startSession() {
    if (this.form.invalid) return;

    const { sessionId, type } = this.form.value;

    this.isStarting = true;

    this.svc.createSession({ sessionId, type }).subscribe({
      next: (response) => {
        this.sessionId = response.sessionId;
        this.sessionStarted = true;
        this.isStarting = false;
        console.log('Session started successfully:', response);
        this.router.navigate(['/SessionList'])
      },
      error: (err) => {
        console.error('Failed to start session:', err);
        this.isStarting = false;
      },
    });
  }
    


}
