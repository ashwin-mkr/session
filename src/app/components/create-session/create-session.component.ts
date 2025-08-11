import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuctionService } from '../../services/auction.service';

@Component({
  selector: 'app-create-session',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-session.component.html',
  styleUrls: ['./create-session.component.scss']
})
export class CreateSessionComponent {
  sessionForm: FormGroup;
  isCreating = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private auctionService: AuctionService,
    private router: Router
  ) {
    this.sessionForm = this.fb.group({
      sessionId: ['', [Validators.required, Validators.minLength(3)]],
      type: ['increasing', Validators.required]
    });
  }

  onSubmit() {
    if (this.sessionForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isCreating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.sessionForm.value;
    
    this.auctionService.createSession(formValue).subscribe({
      next: (response) => {
        this.isCreating.set(false);
        this.successMessage.set(`Session "${response.sessionId}" created successfully!`);
        
        setTimeout(() => {
          this.router.navigate(['/sessions']);
        }, 2000);
      },
      error: (error) => {
        this.isCreating.set(false);
        this.errorMessage.set(
          error.error?.message || 'Failed to create session. Please try again.'
        );
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.sessionForm.controls).forEach(key => {
      const control = this.sessionForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.sessionForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }
}