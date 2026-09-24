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
        <p>Choose your role, fill in your details, and get started.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form" autocomplete="off">
        <label>
          Full Name
          <input
            formControlName="name"
            autocomplete="off"
            spellcheck="false"
            placeholder="e.g. Rahul Sharma"
          />
          <small *ngIf="hasError('name', 'required')" class="field-error">
            Full name is required.
          </small>
        </label>

        <label>
          Email Address (Gmail)
          <input
            type="email"
            formControlName="email"
            autocomplete="off"
            spellcheck="false"
            placeholder="you@gmail.com"
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
            autocomplete="off"
            spellcheck="false"
            placeholder="10-digit mobile number"
          />
          <small *ngIf="hasError('phoneNumber', 'required')" class="field-error">
            Phone number is required.
          </small>
          <small *ngIf="hasError('phoneNumber', 'pattern')" class="field-error">
            Enter a valid 10-digit phone number.
          </small>
        </label>

        <label>
          Password
          <input
            type="password"
            formControlName="password"
            autocomplete="off"
            placeholder="Min. 8 chars (1 uppercase, 1 number, 1 special)"
          />
          <small *ngIf="hasError('password', 'required')" class="field-error">
            Password is required.
          </small>
          <small *ngIf="hasError('password', 'pattern')" class="field-error">
            Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
          </small>
        </label>

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

  protected readonly roles: Array<{ label: string; value: AppRole; help: string }> = [
    { label: 'Customer', value: 'CUSTOMER', help: 'Order & enjoy food' },
    { label: 'Restaurant Owner', value: 'RESTAURANT_OWNER', help: 'Register kitchen & menu' },
    { label: 'Delivery Partner', value: 'DELIVERY_PARTNER', help: 'Deliver orders & earn' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
    password: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/),
      ],
    ],
    role: ['CUSTOMER' as AppRole, [Validators.required]],
  });

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
      this.message = 'Please fix the highlighted fields before creating your account.';
      return;
    }

    this.loading = true;
    this.message = '';
    const raw = this.form.getRawValue();

    // Automatically split Full Name into first and last name for backend compatibility
    const nameParts = raw.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const baseUsername = raw.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const username = (baseUsername || firstName).toLowerCase();

    const request: RegisterRequest = {
      firstName,
      lastName,
      username,
      email: raw.email.trim().toLowerCase(),
      phoneNumber: raw.phoneNumber.trim(),
      password: raw.password,
      role: raw.role,
    };

    this.auth.register(request).subscribe({
      next: () => {
        this.loading = false;
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
