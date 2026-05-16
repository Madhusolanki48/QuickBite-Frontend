import { NgFor, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApiService } from '../../services/auth-api.service';

type ResetStep = 1 | 2 | 3;

const PASSWORD_RULES = [
  {
    key: 'length',
    label: 'Minimum 8 characters',
    check: (value: string) => value.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least one uppercase letter',
    check: (value: string) => /[A-Z]/.test(value),
  },
  {
    key: 'lowercase',
    label: 'At least one lowercase letter',
    check: (value: string) => /[a-z]/.test(value),
  },
  {
    key: 'number',
    label: 'At least one number',
    check: (value: string) => /\d/.test(value),
  },
  {
    key: 'special',
    label: 'At least one special character',
    check: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const newPassword = String(control.get('newPassword')?.value ?? '');
    const confirmPassword = String(control.get('confirmNewPassword')?.value ?? '');

    if (!confirmPassword) {
      return null;
    }

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-forgot-password-page',
  imports: [NgFor, NgIf, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card auth-card auth-card--reset">
      <div *ngIf="toastMessage" class="toast" [class.toast--error]="toastType === 'error'">
        {{ toastMessage }}
      </div>

      <div class="auth-card__header auth-card__header--reset">
        <p class="eyebrow">Reset password</p>
        <div *ngIf="step === 3" class="status-chip status-chip--success status-chip--reset">
          <span class="status-chip__icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
              <path
                d="M16.667 5.833 8.333 14.167l-4.166-4.167"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          Verify Email
        </div>
        <h2>{{ heading() }}</h2>
        <p>{{ subtitle() }}</p>
      </div>

      <div class="wizard-stage wizard-stage--reset">
        <form *ngIf="step === 1" [formGroup]="requestForm" (ngSubmit)="requestReset()" class="form" autocomplete="off">
          <label class="field">
            Email
            <div class="field-shell field-shell--status">
              <input
                formControlName="email"
                placeholder="Enter your registered email"
                autocomplete="email"
                spellcheck="false"
              />
              <span
                *ngIf="requestForm.controls.email.valid && requestForm.controls.email.value"
                class="field-status field-status--success"
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
                  <path
                    d="M16.667 5.833 8.333 14.167l-4.166-4.167"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </label>

          <button class="primary auth-action" type="submit" [disabled]="requestLoading || requestForm.invalid">
            <span *ngIf="requestLoading" class="btn-spinner" aria-hidden="true"></span>
            <span>{{ requestLoading ? 'Sending...' : 'Send Reset Code' }}</span>
          </button>
        </form>

        <form *ngIf="step === 2" [formGroup]="verifyForm" (ngSubmit)="verifyCode()" class="form" autocomplete="off">
          <label class="field">
            Email
            <div class="field-shell field-shell--status">
              <input [value]="requestForm.controls.email.value" readonly />
              <span class="field-status field-status--success" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
                  <path
                    d="M16.667 5.833 8.333 14.167l-4.166-4.167"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </label>

          <div class="step-copy">
            Enter the reset code sent to <strong>{{ requestForm.controls.email.value }}</strong>.
          </div>

          <label class="field">
            Reset Code
            <div class="field-shell field-shell--code field-shell--inline-meta">
              <input
                formControlName="otp"
                type="text"
                inputmode="numeric"
                maxlength="6"
                autocomplete="one-time-code"
                placeholder="Enter the 6-digit code"
                (input)="onResetCodeInput($event)"
              />
              <div class="code-meta">
                <span class="otp-meta__timer">{{ resendLabel() }}</span>
                <button
                  type="button"
                  class="text-button"
                  (click)="resendOtp()"
                  [disabled]="resendLoading || resendCountdown > 0"
                >
                  {{ resendLoading ? 'Resending...' : 'Resend' }}
                </button>
              </div>
            </div>
          </label>

          <small *ngIf="hasVerifyError('otp', 'required')" class="field-error">
            Enter the 6-digit code from your email.
          </small>
          <small *ngIf="hasVerifyError('otp', 'pattern')" class="field-error">
            Enter the 6-digit code from your email.
          </small>

          <button class="primary auth-action" type="submit" [disabled]="verifyLoading || verifyForm.invalid">
            <span *ngIf="verifyLoading" class="btn-spinner" aria-hidden="true"></span>
            <span>{{ verifyLoading ? 'Verifying...' : 'Verify Code' }}</span>
          </button>
        </form>

        <form *ngIf="step === 3" [formGroup]="passwordForm" (ngSubmit)="resetPassword()" class="form" autocomplete="off">
          <label class="field password-field">
            New Password
            <div class="password-input">
              <input
                [type]="showNewPassword ? 'text' : 'password'"
                formControlName="newPassword"
                placeholder="Enter new password"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="toggleNewPassword()"
                [attr.aria-label]="showNewPassword ? 'Hide new password' : 'Show new password'"
              >
                <svg *ngIf="!showNewPassword" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                  <path
                    d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linejoin="round"
                  />
                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" stroke-width="1.8" />
                </svg>
                <svg *ngIf="showNewPassword" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                  <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path
                    d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 1.42-.36"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="M9.88 5.07A9.94 9.94 0 0 1 12 4c6 0 9.5 8 9.5 8a18.9 18.9 0 0 1-4.1 5.08"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M6.2 6.2A18.45 18.45 0 0 0 2.5 12s3.5 7 9.5 7c1.1 0 2.13-.18 3.08-.5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <section class="password-rules" [class.password-rules--hidden]="!shouldShowPasswordRules()">
              <ul class="password-rules__list" aria-live="polite">
                <li
                  *ngFor="let rule of passwordRulesView(); trackBy: trackPasswordRule"
                  class="password-rules__item"
                  [class.password-rules__item--met]="rule.met"
                >
                  <span class="password-rules__bullet" aria-hidden="true">
                    <svg *ngIf="rule.met" viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
                      <path
                        d="M16.667 5.833 8.333 14.167l-4.166-4.167"
                        stroke="currentColor"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span>{{ rule.label }}</span>
                </li>
              </ul>
            </section>
          </label>

          <label class="field password-field">
            Confirm Password
            <div class="password-input">
              <input
                [type]="showConfirmPassword ? 'text' : 'password'"
                formControlName="confirmNewPassword"
                placeholder="Confirm new password"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="toggleConfirmPassword()"
                [attr.aria-label]="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'"
              >
                <svg *ngIf="!showConfirmPassword" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                  <path
                    d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linejoin="round"
                  />
                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" stroke-width="1.8" />
                </svg>
                <svg *ngIf="showConfirmPassword" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                  <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path
                    d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 1.42-.36"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="M9.88 5.07A9.94 9.94 0 0 1 12 4c6 0 9.5 8 9.5 8a18.9 18.9 0 0 1-4.1 5.08"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M6.2 6.2A18.45 18.45 0 0 0 2.5 12s3.5 7 9.5 7c1.1 0 2.13-.18 3.08-.5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <small *ngIf="showPasswordMismatch()" class="field-error">Passwords do not match.</small>
          </label>

          <button class="primary auth-action" type="submit" [disabled]="resetLoading || !canResetPassword()">
            <span *ngIf="resetLoading" class="btn-spinner" aria-hidden="true"></span>
            <span>{{ resetLoading ? 'Resetting...' : 'Reset Password' }}</span>
          </button>
        </form>
      </div>

      <p class="helper helper--backlink">
        <a routerLink="/login">Back to Login</a>
      </p>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class ForgotPasswordPageComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);
  private toastTimer?: ReturnType<typeof setTimeout>;
  private resendTimer?: ReturnType<typeof setInterval>;
  private operationTimeoutTimer?: ReturnType<typeof setTimeout>;

  protected requestLoading = false;
  protected verifyLoading = false;
  protected resetLoading = false;
  protected resendLoading = false;
  protected step: ResetStep = 1;
  protected toastMessage = '';
  protected toastType: 'success' | 'error' = 'success';
  protected resendCountdown = 0;
  protected showNewPassword = false;
  protected showConfirmPassword = false;

  protected readonly requestForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly verifyForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator() },
  );

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
    if (this.operationTimeoutTimer) {
      clearTimeout(this.operationTimeoutTimer);
    }
  }

  heading(): string {
    switch (this.step) {
      case 2:
        return 'Verify your email';
      case 3:
        return 'Create New Password';
      case 1:
      default:
        return 'Forgot your password?';
    }
  }

  subtitle(): string {
    switch (this.step) {
      case 2:
        return 'Enter the reset code sent to your email.';
      case 3:
        return 'Enter and confirm your new password to reset your account password.';
      case 1:
      default:
        return 'Enter your registered email to receive a reset code.';
    }
  }

  async requestReset(): Promise<void> {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    console.log('Forgot password request received');
    this.requestLoading = true;
    this.showToast('');
    const email = this.requestForm.controls.email.value.trim().toLowerCase();
    this.startOperationTimeout('Request timed out. Please try again.');

    try {
      const response = await firstValueFrom(this.auth.forgotPassword({ email }));
      if (!response.success) {
        this.showToast(response.message || 'Could not send reset code. Please try again.', 'error');
        return;
      }

      console.log('OTP sent');
      this.step = 2;
      this.resetVerifyState();
      this.startResendCountdown();
      this.showToast(response.message || 'OTP sent successfully');
    } catch (error) {
      console.error(error);
      this.showToast(this.readErrorMessage(error, 'Could not send reset code. Please try again.'), 'error');
    } finally {
      this.requestLoading = false;
      this.clearOperationTimeout();
    }
  }

  async verifyCode(): Promise<void> {
    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.verifyLoading = true;
    this.showToast('');
    const email = this.requestForm.controls.email.value.trim().toLowerCase();
    const otp = this.verifyForm.controls.otp.value.trim();
    this.startOperationTimeout('Code verification timed out. Please try again.');

    try {
      const response = await firstValueFrom(this.auth.verifyResetOtp({ email, otp }));
      if (!response.success) {
        this.showToast(response.message || 'Code verification failed. Please try again.', 'error');
        return;
      }

      this.step = 3;
      this.passwordForm.reset({ newPassword: '', confirmNewPassword: '' });
      this.showToast(response.message || 'OTP verified');
    } catch (error) {
      console.error(error);
      this.showToast(this.readErrorMessage(error, 'Code verification failed. Please check the code and try again.'), 'error');
    } finally {
      this.verifyLoading = false;
      this.clearOperationTimeout();
    }
  }

  async resetPassword(): Promise<void> {
    if (!this.canResetPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.resetLoading = true;
    this.showToast('');
    const email = this.requestForm.controls.email.value.trim().toLowerCase();
    const newPassword = this.passwordForm.controls.newPassword.value;
    this.startOperationTimeout('Password reset timed out. Please try again.');

    try {
      const response = await firstValueFrom(this.auth.resetPassword({ email, newPassword }));
      if (!response.success) {
        this.showToast(response.message || 'Reset failed. Please try again.', 'error');
        return;
      }

      this.showToast(response.message || 'Password reset successfully.');
      window.setTimeout(() => void this.router.navigate(['/login'], { queryParams: { reset: '1' } }), 700);
    } catch (error) {
      console.error(error);
      this.showToast(this.readErrorMessage(error, 'Reset failed. Please try again.'), 'error');
    } finally {
      this.resetLoading = false;
      this.clearOperationTimeout();
    }
  }

  onResetCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    if (input.value !== digits) {
      input.value = digits;
    }
    this.verifyForm.controls.otp.setValue(digits, { emitEvent: false });
    this.verifyForm.controls.otp.markAsTouched();
  }

  async resendOtp(): Promise<void> {
    if (this.resendCountdown > 0 || this.resendLoading) {
      return;
    }

    const email = this.requestForm.controls.email.value.trim().toLowerCase();
    if (!email) {
      this.showToast('Enter your email first, then resend the code.', 'error');
      return;
    }

    this.resendLoading = true;
    this.showToast('');
    this.startOperationTimeout('Resend timed out. Please try again.');

    try {
      const response = await firstValueFrom(this.auth.forgotPassword({ email }));
      if (!response.success) {
        this.showToast(response.message || 'Could not resend the code. Please try again.', 'error');
        return;
      }

      console.log('OTP sent');
      this.startResendCountdown();
      this.showToast(response.message || 'OTP sent successfully');
    } catch (error) {
      console.error(error);
      this.showToast(this.readErrorMessage(error, 'Could not resend the code. Please try again.'), 'error');
    } finally {
      this.resendLoading = false;
      this.clearOperationTimeout();
    }
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  protected hasVerifyError(controlName: keyof typeof this.verifyForm.controls, errorName: string): boolean {
    const control = this.verifyForm.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  protected shouldShowPasswordRules(): boolean {
    return !!this.passwordForm.controls.newPassword.value;
  }

  protected passwordRulesView(): Array<{ key: string; label: string; met: boolean }> {
    const value = this.passwordForm.controls.newPassword.value;
    if (!value) {
      return [];
    }

    return PASSWORD_RULES.map(({ key, label, check }) => ({ key, label, met: check(value) }));
  }

  protected trackPasswordRule(_: number, rule: { key: string }): string {
    return rule.key;
  }

  protected showPasswordMismatch(): boolean {
    const confirmValue = this.passwordForm.controls.confirmNewPassword.value;
    return !!confirmValue && this.passwordForm.hasError('passwordMismatch');
  }

  protected canResetPassword(): boolean {
    return this.arePasswordRulesMet() && this.passwordForm.valid && !this.passwordForm.hasError('passwordMismatch');
  }

  protected resendLabel(): string {
    if (this.resendCountdown > 0) {
      return `Resend code in ${this.formatTime(this.resendCountdown)}`;
    }
    return "Didn't receive code? Resend code";
  }

  protected formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  }

  private arePasswordRulesMet(): boolean {
    const value = this.passwordForm.controls.newPassword.value;
    if (!value) {
      return false;
    }

    return PASSWORD_RULES.every((rule) => rule.check(value));
  }

  private resetVerifyState(): void {
    this.verifyForm.reset({ otp: '' });
  }

  private startOperationTimeout(message: string, timeoutMs = 15000): void {
    this.clearOperationTimeout();
    this.operationTimeoutTimer = window.setTimeout(() => {
      console.error(new Error(message));
      this.requestLoading = false;
      this.verifyLoading = false;
      this.resetLoading = false;
      this.resendLoading = false;
      this.showToast(message, 'error');
    }, timeoutMs);
  }

  private clearOperationTimeout(): void {
    if (this.operationTimeoutTimer) {
      clearTimeout(this.operationTimeoutTimer);
      this.operationTimeoutTimer = undefined;
    }
  }

  private startResendCountdown(seconds = 30): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }

    this.resendCountdown = seconds;
    this.resendTimer = window.setInterval(() => {
      if (this.resendCountdown <= 1) {
        this.resendCountdown = 0;
        if (this.resendTimer) {
          clearInterval(this.resendTimer);
        }
        return;
      }

      this.resendCountdown -= 1;
    }, 1000);
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object') {
        const message = (body as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }

    return fallback;
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (!message) {
      return;
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = '';
    }, 2800);
  }
}
