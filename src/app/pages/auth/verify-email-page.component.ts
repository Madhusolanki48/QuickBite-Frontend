import { NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card auth-card">
      <div *ngIf="toastMessage" class="toast" [class.toast--error]="toastTone === 'error'">
        {{ toastMessage }}
      </div>
      <div class="auth-card__header">
        <p class="eyebrow">Verify your email</p>
        <h2>Check your inbox.</h2>
        <p>
          We sent a 6-digit verification code to
          <strong style="color: #fff;">{{ form.controls.email.value || 'your email' }}</strong>.
        </p>
      </div>

      <form [formGroup]="form" (ngSubmit)="verify()" class="form" autocomplete="off">
        <label>
          Email Address
          <input formControlName="email" placeholder="Enter your registration email" />
          <small *ngIf="form.controls.email.touched && form.controls.email.hasError('required')" class="field-error">
            Email is required.
          </small>
        </label>

        <label>
          Verification Code (OTP)
          <input
            formControlName="otp"
            inputmode="numeric"
            maxlength="6"
            placeholder="6-digit code"
            style="letter-spacing: 0.25em; font-size: 1.15rem; font-weight: 700; text-align: center;"
          />
          <small *ngIf="form.controls.otp.touched && form.controls.otp.invalid" class="field-error">
            Enter the 6-digit code sent to your email.
          </small>
        </label>

        <button class="primary" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Verifying...' : 'Verify & Continue' }}
        </button>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.5rem;">
          <button
            class="secondary"
            type="button"
            style="flex: 1;"
            [disabled]="loading || resendLoading || cooldownSeconds > 0"
            (click)="resendOtp()"
          >
            <span *ngIf="cooldownSeconds > 0">Resend in {{ cooldownSeconds }}s</span>
            <span *ngIf="cooldownSeconds === 0">{{ resendLoading ? 'Sending...' : 'Resend Code' }}</span>
          </button>
        </div>

        <p class="helper">Already verified? <a routerLink="/login">Sign in</a></p>

        <p *ngIf="message" class="message">{{ message }}</p>
      </form>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class VerifyEmailPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected loading = false;
  protected resendLoading = false;
  protected cooldownSeconds = 60;
  private cooldownTimer?: ReturnType<typeof setInterval>;
  protected message = '';
  protected toastMessage = '';
  protected toastTone: 'success' | 'error' | 'info' = 'info';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.form.patchValue({ email });
    }
    this.startCooldown(60);
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }

  private startCooldown(seconds: number): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.cooldownSeconds = seconds;
    this.cooldownTimer = setInterval(() => {
      if (this.cooldownSeconds > 0) {
        this.cooldownSeconds--;
      } else {
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer);
        }
      }
    }, 1000);
  }

  verify(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.message = '';
    this.showToast('Verifying code...', 'info');

    this.auth.verifyRegistration(this.form.getRawValue()).subscribe({
      next: (response) => {
        if (response.token) {
          this.session.startSession(response);
          this.auth.getCurrentUser().subscribe({
            next: (currentUser) => {
              this.session.replaceUser(currentUser);
              this.showToast('Email verified successfully!', 'success');
              this.loading = false;
              const destination = this.determineDestination(currentUser);
              window.setTimeout(() => void this.router.navigateByUrl(destination), 300);
            },
            error: () => {
              this.showToast('Email verified successfully!', 'success');
              this.loading = false;
              const destination = this.determineDestination(response.user);
              window.setTimeout(() => void this.router.navigateByUrl(destination), 300);
            },
          });
          return;
        }

        // If no token was returned, route based on user profile
        this.showToast('Email verified successfully.', 'success');
        this.loading = false;
        const dest = this.determineDestination(response.user);
        window.setTimeout(() => void this.router.navigateByUrl(dest), 300);
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

  private determineDestination(user: any): string {
    return this.session.routeAfterAuth(user);
  }

  resendOtp(): void {
    if (this.cooldownSeconds > 0) return;

    const email = this.form.controls.email.value.trim().toLowerCase();
    if (!email) {
      this.message = 'Please enter your email address first.';
      return;
    }

    this.resendLoading = true;
    this.message = '';
    this.auth.resendRegistrationOtp({ email }).subscribe({
      next: (response) => {
        this.showToast('A new 6-digit code has been sent to your email.', 'success');
        this.resendLoading = false;
        this.startCooldown(60);
      },
      error: (error) => {
        this.message = this.auth.authErrorMessage(
          error,
          'Could not resend the code. Please try again later.',
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
    }, 2800);
  }
}
