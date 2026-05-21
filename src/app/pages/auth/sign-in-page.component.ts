import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AppRole, RegisterRequest } from '../../core/app.models';
import { AuthApiService } from '../../services/auth-api.service';
import { CatalogService } from '../../services/catalog.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-sign-in-page',
  imports: [NgFor, NgIf, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card auth-card">
      <div class="auth-card__header">
        <p class="eyebrow">Create account</p>
        <h2>Choose your role and start your QuickBite journey.</h2>
        <p>Create a new account, pick a role, and then continue to login.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form" autocomplete="off">
        <div class="grid two">
          <label>
            First name
            <input
              formControlName="firstName"
              [readOnly]="firstNameLocked"
              (focus)="firstNameLocked = false"
              autocomplete="off"
              spellcheck="false"
              autocapitalize="off"
              placeholder="Enter your first name"
            />
            <small *ngIf="hasError('firstName', 'required')" class="field-error">
              First name is required.
            </small>
          </label>
          <label>
            Last name
            <input
              formControlName="lastName"
              [readOnly]="lastNameLocked"
              (focus)="lastNameLocked = false"
              autocomplete="off"
              spellcheck="false"
              autocapitalize="off"
              placeholder="Enter your last name"
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
            autocapitalize="off"
            placeholder="Choose a username"
          />
          <small *ngIf="hasError('username', 'required')" class="field-error">
            Username is required.
          </small>
          <small *ngIf="hasError('username', 'minlength')" class="field-error">
            Username must be at least 3 characters.
          </small>
        </label>

        <label>
          Email
          <input
            formControlName="email"
            [readOnly]="emailLocked"
            (focus)="emailLocked = false"
            autocomplete="off"
            spellcheck="false"
            autocapitalize="off"
            placeholder="Enter your email address"
          />
          <small *ngIf="hasError('email', 'required')" class="field-error"
            >Email is required.</small
          >
          <small *ngIf="hasError('email', 'email')" class="field-error">
            Enter a valid email address.
          </small>
        </label>

        <label>
          Phone number
          <input
            formControlName="phoneNumber"
            [readOnly]="phoneLocked"
            (focus)="phoneLocked = false"
            autocomplete="off"
            spellcheck="false"
            autocapitalize="off"
            placeholder="Enter a 10 to 15 digit phone number"
          />
          <small *ngIf="hasError('phoneNumber', 'required')" class="field-error">
            Phone number is required.
          </small>
          <small *ngIf="hasError('phoneNumber', 'pattern')" class="field-error">
            Enter a valid 10 to 15 digit phone number.
          </small>
        </label>

        <label>
          Password
          <input
            type="password"
            formControlName="password"
            [readOnly]="passwordLocked"
            (focus)="passwordLocked = false"
            autocomplete="off"
            placeholder="Create a secure password"
          />
          <small *ngIf="hasError('password', 'required')" class="field-error">
            Password is required.
          </small>
          <small *ngIf="hasError('password', 'minlength')" class="field-error">
            Password must be at least 8 characters.
          </small>
        </label>

        <label *ngIf="isRestaurantOwner()">
          Restaurant
          <select formControlName="restaurantId">
            <option value="">Select the restaurant you manage</option>
            <option *ngFor="let restaurant of catalog.restaurantList()" [value]="restaurant.id">
              {{ restaurant.name }}
            </option>
          </select>
          <small *ngIf="hasError('restaurantId', 'required')" class="field-error">
            Select the restaurant you manage.
          </small>
        </label>

        <p *ngIf="isRestaurantOwner()" class="helper">
          New owner accounts need admin approval before they can log in.
        </p>

        <div>
          <span class="field-label">Role</span>
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

        <button class="primary" type="submit" [disabled]="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>

        <p *ngIf="message" class="message">{{ message }}</p>

        <p class="helper">Already have an account? <a routerLink="/login">Go to login</a></p>
      </form>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class SignInPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  protected readonly catalog = inject(CatalogService);
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
  protected readonly roles: Array<{ label: string; value: AppRole; help: string }> = [
    { label: 'Customer', value: 'CUSTOMER', help: 'Browse and order food' },
    { label: 'Restaurant Owner', value: 'RESTAURANT_OWNER', help: 'Manage your menu' },
    { label: 'Delivery Agent', value: 'DELIVERY_PARTNER', help: 'Accept deliveries' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['CUSTOMER' as AppRole, [Validators.required]],
    restaurantId: [''],
  });

  protected isRestaurantOwner(): boolean {
    return this.form.controls.role.value === 'RESTAURANT_OWNER';
  }

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

    if (this.isRestaurantOwner()) {
      const restaurantId = this.form.controls.restaurantId.value.trim();
      if (!restaurantId) {
        this.form.controls.restaurantId.setErrors({ required: true });
        this.form.controls.restaurantId.markAsTouched();
        this.message = 'Please select the restaurant you manage.';
        return;
      }
    }

    this.loading = true;
    this.message = '';
    const raw = this.form.getRawValue();
    const pendingApprovalFlag = raw.role === 'CUSTOMER' ? '0' : '1';
    const request = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      username: raw.username,
      email: raw.email,
      phoneNumber: raw.phoneNumber,
      password: raw.password,
      role: raw.role,
      restaurantId: raw.role === 'RESTAURANT_OWNER' ? raw.restaurantId : undefined,
    } satisfies RegisterRequest;
    this.auth.register(request).subscribe({
      next: (response) => {
        if (response.token) {
          this.session.startSession(response);
          this.auth.getCurrentUser().subscribe({
            next: (currentUser) => {
              this.session.replaceUser(currentUser);
              this.loading = false;
              void this.router.navigateByUrl(this.session.routeAfterAuth(currentUser));
            },
            error: () => {
              this.loading = false;
              void this.router.navigateByUrl(this.session.routeAfterAuth(response.user));
            },
          });
          return;
        }

        if (request.role === 'CUSTOMER') {
          this.loading = false;
          void this.router.navigate(['/verify-email'], {
            queryParams: {
              email: request.email,
              pendingApproval: '0',
            },
          });
          return;
        }

        this.loading = false;
        void this.router.navigate(['/verify-email'], {
          queryParams: {
            pendingApproval: pendingApprovalFlag,
            email: request.email,
          },
        });
      },
      error: (error) => {
        this.message = this.auth.authErrorMessage(
          error,
          'Account creation is taking too long. Please try again.',
        );
        this.loading = false;
      },
    });
  }
}
