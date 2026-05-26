import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AppRole, RegisterRequest } from '../../core/app.models';
import { AuthApiService } from '../../services/auth-api.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-sign-in-page',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card auth-card">
      <div class="auth-card__header">
        <p class="eyebrow">Create account</p>
        <h2>Join QuickBite today.</h2>
        <p>Choose your role, fill in your details, and verify your email.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form" autocomplete="off">
        <div class="grid two">
          <label>
            First Name
            <input
              formControlName="firstName"
              [readOnly]="firstNameLocked"
              (focus)="firstNameLocked = false"
              autocomplete="off"
              spellcheck="false"
              placeholder="e.g. Rahul"
            />
            <small *ngIf="hasError('firstName', 'required')" class="field-error">
              First name is required.
            </small>
          </label>
          <label>
            Last Name
            <input
              formControlName="lastName"
              [readOnly]="lastNameLocked"
              (focus)="lastNameLocked = false"
              autocomplete="off"
              spellcheck="false"
              placeholder="e.g. Sharma"
            />
            <small *ngIf="hasError('lastName', 'required')" class="field-error">
              Last name is required.
            </small>
          </label>
        </div>

        <label>
          Username
          <input
            formControlName="username"
            [readOnly]="usernameLocked"
            (focus)="usernameLocked = false"
            autocomplete="off"
            spellcheck="false"
            placeholder="Choose a unique username"
          />
          <small *ngIf="hasError('username', 'required')" class="field-error">
            Username is required.
          </small>
          <small *ngIf="hasError('username', 'minlength')" class="field-error">
            Username must be at least 3 characters.
          </small>
        </label>

        <label>
          Email Address
          <input
            type="email"
            formControlName="email"
            [readOnly]="emailLocked"
            (focus)="emailLocked = false"
            autocomplete="off"
            spellcheck="false"
            placeholder="you@example.com"
          />
          <small *ngIf="hasError('email', 'required')" class="field-error">
            Email is required.
          </small>
          <small *ngIf="hasError('email', 'email')" class="field-error">
            Enter a valid email address.
          </small>
        </label>

        <label>
          Phone Number
          <input
            type="tel"
            formControlName="phoneNumber"
            [readOnly]="phoneLocked"
            (focus)="phoneLocked = false"
            autocomplete="off"
            spellcheck="false"
            placeholder="10-digit mobile number"
          />
          <small *ngIf="hasError('phoneNumber', 'required')" class="field-error">
            Phone number is required.
          </small>
          <small *ngIf="hasError('phoneNumber', 'pattern')" class="field-error">
            Enter a valid 10 to 15 digit phone number.
          </small>
        </label>

        <div class="grid two">
          <label>
            Password
            <input
              type="password"
              formControlName="password"
              [readOnly]="passwordLocked"
              (focus)="passwordLocked = false"
              autocomplete="off"
              placeholder="Min. 8 characters"
            />
            <small *ngIf="hasError('password', 'required')" class="field-error">
              Password is required.
            </small>
            <small *ngIf="hasError('password', 'minlength')" class="field-error">
              Must be at least 8 characters.
            </small>
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              formControlName="confirmPassword"
              [readOnly]="confirmPasswordLocked"
              (focus)="confirmPasswordLocked = false"
              autocomplete="off"
              placeholder="Re-enter password"
            />
            <small *ngIf="hasError('confirmPassword', 'required')" class="field-error">
              Confirm your password.
            </small>
            <small *ngIf="form.touched && form.hasError('passwordMismatch')" class="field-error">
              Passwords do not match.
            </small>
          </label>
        </div>

        <div>
          <span class="field-label">I am joining as</span>
          <div class="role-grid">
            <button
              type="button"
              *ngFor="let role of roles"
              class="role-chip"
              [class.active]="form.value.role === role.value"
              (click)="chooseRole(role.value)"
            >
              <strong>{{ role.label }}</strong>
              <span>{{ role.help }}</span>
            </button>
          </div>
        </div>

        <p *ngIf="form.value.role !== 'CUSTOMER'" class="helper" style="color: #f59e0b;">
          ℹ️ {{ form.value.role === 'RESTAURANT_OWNER' ? 'Restaurant Owner' : 'Delivery Partner' }} accounts complete a short onboarding and require admin approval before going live.
        </p>

        <button class="primary" type="submit" [disabled]="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>

        <p *ngIf="message" class="message">{{ message }}</p>

        <p class="helper">Already have an account? <a routerLink="/login">Sign in</a></p>
      </form>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class SignInPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected loading = false;
  protected message = '';
  protected firstNameLocked = true;
  protected lastNameLocked = true;
  protected emailLocked = true;
  protected usernameLocked = true;
  protected phoneLocked = true;
  protected passwordLocked = true;
  protected confirmPasswordLocked = true;

  protected readonly roles: Array<{ label: string; value: AppRole; help: string }> = [
    { label: 'Customer', value: 'CUSTOMER', help: 'Order & enjoy food' },
    { label: 'Restaurant Owner', value: 'RESTAURANT_OWNER', help: 'Register kitchen & menu' },
    { label: 'Delivery Partner', value: 'DELIVERY_PARTNER', help: 'Deliver orders & earn' },
  ];

  protected readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      role: ['CUSTOMER' as AppRole, [Validators.required]],
    },
    {
      validators: (group) => {
        const pass = group.get('password')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
      },
    },
  );

  protected hasError(controlName: keyof typeof this.form.controls, errorName: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  chooseRole(role: AppRole): void {
    this.session.setPendingRole(role);
    this.message = '';
    this.form.patchValue({ role });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.hasError('passwordMismatch')) {
        this.message = 'Passwords do not match. Please verify.';
      } else {
        this.message = 'Please fix the highlighted fields before creating your account.';
      }
      return;
    }

    this.loading = true;
    this.message = '';
    const raw = this.form.getRawValue();
    const request = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      username: raw.username.trim(),
      email: raw.email.trim().toLowerCase(),
      phoneNumber: raw.phoneNumber.trim(),
      password: raw.password,
      role: raw.role,
    } satisfies RegisterRequest;

    this.auth.register(request).subscribe({
      next: (response) => {
        this.loading = false;
        // Strict privacy: OTP is NEVER sent in query parameters or exposed in UI
        void this.router.navigate(['/verify-email'], {
          queryParams: {
            email: request.email,
          },
        });
      },
      error: (error) => {
        this.message = this.auth.authErrorMessage(
          error,
          'Account creation failed. Please check your details and try again.',
        );
        this.loading = false;
      },
    });
  }
}
