import { NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-verify-email-page',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card auth-card">
      <div *ngIf="toastMessage" class="toast" [class.toast--error]="toastTone === 'error'">
        {{ toastMessage }}
      </div>
      <div class="auth-card__header">
        <p class="eyebrow">Verify email</p>
        <h2>Enter the one-time code sent to your inbox.</h2>
        <p>We sent a 6-digit OTP to your email address after registration.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="verify()" class="form" autocomplete="off">
        <label>
          Email
          <input formControlName="email" placeholder="Enter your registration email" />
        </label>

        <label>
          OTP
          <input
            formControlName="otp"
            inputmode="numeric"
            maxlength="6"
            placeholder="Enter the 6-digit code"
          />
        </label>

        <button class="primary" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Verifying...' : 'Verify email' }}
        </button>

        <button
          class="secondary"
          type="button"
          [disabled]="loading || resendLoading"
          (click)="resendOtp()"
        >
          {{ resendLoading ? 'Sending new code...' : 'Resend OTP' }}
        </button>

        <p class="helper">
          Already verified? <a routerLink="/login">Back to login</a>
        </p>

        <p *ngIf="message" class="message">{{ message }}</p>
      </form>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class VerifyEmailPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected loading = false;
  protected resendLoading = false;
  protected message = '';
  protected toastMessage = '';
  protected toastTone: 'success' | 'error' | 'info' = 'info';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    const pendingApproval = this.route.snapshot.queryParamMap.get('pendingApproval');
    if (email) {
      this.form.patchValue({ email });
    }
    if (pendingApproval === '1') {
      this.message = 'After verification your account will still need admin approval.';
    }
  }

  verify(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.message = '';
    this.showToast('Verifying your code...', 'info');
    this.auth.verifyRegistration(this.form.getRawValue()).subscribe({
      next: (response) => {
        if (response.token) {
          this.session.startSession(response);
          this.auth.getCurrentUser().subscribe({
            next: (currentUser) => {
              this.session.replaceUser(currentUser);
              this.showToast('Email verified successfully.', 'success');
              this.loading = false;
              const destination = this.session.routeAfterAuth(currentUser);
              window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
            },
            error: () => {
              this.showToast('Email verified successfully.', 'success');
              this.loading = false;
              const destination = this.session.routeAfterAuth(response.user);
              window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
            },
          });
          return;
        }

        if (response.user.approvalStatus === 'PENDING') {
          this.showToast('Your email is verified. Your account is waiting for admin approval.', 'info');
          this.loading = false;
          void this.router.navigate(['/approval-pending'], {
            queryParams: {
              name: `${response.user.firstName} ${response.user.lastName ?? ''}`.trim(),
              role: response.user.role,
              restaurantId: response.user.restaurantId ?? '',
              pending: '1',
            },
          });
          return;
        }

        this.showToast('Email verified successfully.', 'success');
        this.loading = false;
        void this.router.navigate(['/login'], {
          queryParams: {
            verified: '1',
            pendingApproval: '0',
          },
        });
      },
      error: (error) => {
        this.message = this.auth.authErrorMessage(
          error,
          'Verification failed. Please check the code and try again.',
        );
        this.showToast(this.message, 'error');
        this.loading = false;
      },
    });
  }

  resendOtp(): void {
    const email = this.form.controls.email.value.trim().toLowerCase();
    if (!email) {
      this.message = 'Enter your email first, then resend the code.';
      return;
    }

    this.resendLoading = true;
    this.message = '';
    this.auth.resendRegistrationOtp({ email }).subscribe({
      next: (response) => {
        this.message = response.message || 'OTP sent again. Check your email inbox.';
        this.showToast(this.message, 'success');
        this.resendLoading = false;
      },
      error: (error) => {
        this.message = this.auth.authErrorMessage(
          error,
          'Could not resend the OTP. Please try again.',
        );
        this.showToast(this.message, 'error');
        this.resendLoading = false;
      },
    });
  }

  private showToast(message: string, tone: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastTone = tone;
    window.setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = '';
      }
    }, 2600);
  }
}
