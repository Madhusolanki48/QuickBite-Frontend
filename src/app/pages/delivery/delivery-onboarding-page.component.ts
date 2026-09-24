import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { DeliveryAgentDirectoryService } from '../../services/delivery-agent-directory.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-delivery-onboarding-page',
  standalone: true,
  imports: [CommonModule, NgIf, ReactiveFormsModule],
  template: `
    <div class="onboard-container">
      <div class="onboard-shell">
        <div class="onboard-top-nav">
          <button type="button" class="back-link-btn" (click)="backToLogin()" title="Return to Sign In">
            <span class="back-arrow">←</span>
            <span>Back to Sign In</span>
          </button>
          <span class="top-nav-hint">Don't want to finish right now? You can sign back in later to complete verification.</span>
        </div>

        <div class="onboard-card">
          <header class="onboard-head">
            <div class="badge">Driver KYC & Onboarding</div>
            <h1>Delivery Partner Verification</h1>
            <p>Register your vehicle and delivery credentials to start earning on the QuickBite delivery fleet.</p>
          </header>

          <!-- Rejection Notice if resubmitting -->
          <div *ngIf="user()?.approvalStatus === 'REJECTED'" class="rejection-alert">
            <div class="alert-icon">⚠️</div>
            <div>
              <strong>Application Needs Revision</strong>
              <p>Admin feedback: {{ user()?.rejectionReason || 'Please verify your license/vehicle details and resubmit.' }}</p>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="onboard-form" autocomplete="off">
            <section class="form-section">
              <h3 class="section-title">1. Personal & Contact Information</h3>

              <div class="form-row">
                <label>
                  Full Name *
                  <input formControlName="fullName" placeholder="Full legal name" />
                  <small *ngIf="isTouchedAndInvalid('fullName')" class="err">Full name is required.</small>
                </label>

                <label>
                  Phone Number *
                  <input formControlName="phoneNumber" placeholder="10-digit mobile number" />
                  <small *ngIf="isTouchedAndInvalid('phoneNumber')" class="err">Valid phone number required.</small>
                </label>
              </div>

              <div class="form-row">
                <label>
                  Residential Address *
                  <input formControlName="address" placeholder="Current residential address & city" />
                  <small *ngIf="isTouchedAndInvalid('address')" class="err">Address is required.</small>
                </label>

                <label>
                  Preferred Delivery Zone *
                  <select formControlName="zone">
                    <option value="Central Zone">Central Zone (High Order Density)</option>
                    <option value="North District">North District</option>
                    <option value="South Suburbs">South Suburbs</option>
                    <option value="Tech Park & IT Hub">Tech Park & IT Hub</option>
                    <option value="West Bay">West Bay</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="form-section">
              <h3 class="section-title">2. Vehicle & Driving Credentials</h3>

              <div class="form-row">
                <label>
                  Vehicle Type *
                  <select formControlName="vehicleType">
                    <option value="Electric Scooter">Electric Scooter (EV Partner)</option>
                    <option value="Motorcycle">Motorcycle / Bike</option>
                    <option value="Scooter">Scooter / Moped</option>
                    <option value="Bicycle">Bicycle / E-Bike</option>
                    <option value="Car">Car</option>
                  </select>
                </label>

                <label>
                  Vehicle Registration Number *
                  <input
                    formControlName="vehicleNumber"
                    placeholder="e.g. MH 02 AB 1234"
                    style="text-transform: uppercase;"
                  />
                  <small *ngIf="isTouchedAndInvalid('vehicleNumber')" class="err">Vehicle registration number is required.</small>
                </label>
              </div>

              <div class="form-row">
                <label>
                  Driving License Number *
                  <input
                    formControlName="drivingLicenseNumber"
                    placeholder="e.g. DL-1420110012345"
                    style="text-transform: uppercase;"
                  />
                  <small *ngIf="isTouchedAndInvalid('drivingLicenseNumber')" class="err">Valid driving license number is required.</small>
                </label>

                <label>
                  Payout UPI ID or Account *
                  <input formControlName="payoutAccount" placeholder="e.g. yourname@okhdfcbank" />
                  <small *ngIf="isTouchedAndInvalid('payoutAccount')" class="err">Payout UPI ID is required.</small>
                </label>
              </div>
            </section>

            <section class="form-section">
              <h3 class="section-title">3. Document & Terms Acknowledgment</h3>
              <div class="acknowledgment-box">
                <label class="check-label">
                  <input type="checkbox" formControlName="acknowledged" />
                  <span>
                    I confirm that all vehicle, license, and personal KYC information provided is authentic and up-to-date. I agree to uphold the QuickBite Partner Service Guidelines and safety standards.
                  </span>
                </label>
                <small *ngIf="isTouchedAndInvalid('acknowledged')" class="err">Please acknowledge the guidelines before proceeding.</small>
              </div>
            </section>

            <div class="submit-actions">
              <button
                type="submit"
                class="primary submit-btn"
                [disabled]="loading"
              >
                {{ loading ? 'Submitting Application...' : 'Submit Profile for Admin Verification' }}
              </button>
              <p *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .onboard-container {
      min-height: 100vh;
      background: radial-gradient(circle at 90% 10%, rgba(255, 90, 0, 0.08), transparent 40%), #0c0d12;
      padding: clamp(1.25rem, 2.5vw, 2.5rem) clamp(1rem, 2vw, 2rem);
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #f3f4f6;
    }
    .onboard-shell {
      max-width: 760px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .onboard-top-nav {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .back-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f3f4f6;
      padding: 0.55rem 1.15rem;
      border-radius: 12px;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    }
    .back-link-btn:hover {
      background: rgba(255, 90, 0, 0.15);
      border-color: rgba(255, 90, 0, 0.4);
      color: #ff5a00;
      transform: translateX(-3px);
    }
    .back-link-btn .back-arrow {
      font-size: 1.2rem;
      line-height: 1;
      transition: transform 0.2s ease;
    }
    .back-link-btn:hover .back-arrow {
      transform: translateX(-2px);
    }
    .top-nav-hint {
      color: #9ca3af;
      font-size: 0.85rem;
    }
    .onboard-card {
      max-width: 760px;
      width: 100%;
      background: rgba(20, 22, 29, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .onboard-head {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(255, 90, 0, 0.15);
      color: #ff5a00;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    .onboard-head h1 {
      font-size: 2rem;
      margin: 0 0 0.5rem 0;
      color: #fff;
    }
    .onboard-head p {
      color: #9ca3af;
      margin: 0;
      font-size: 1rem;
    }
    .rejection-alert {
      display: flex;
      gap: 1rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      align-items: flex-start;
    }
    .alert-icon {
      font-size: 1.5rem;
    }
    .rejection-alert strong {
      color: #ef4444;
      display: block;
      margin-bottom: 0.25rem;
    }
    .rejection-alert p {
      margin: 0;
      color: #fca5a5;
      font-size: 0.92rem;
    }
    .form-section {
      margin-bottom: 2.25rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .section-title {
      font-size: 1.25rem;
      color: #fff;
      margin: 0 0 1.25rem 0;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.25rem;
    }
    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.88rem;
      font-weight: 500;
      color: #d1d5db;
    }
    input, select {
      background: rgba(15, 17, 23, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, select:focus {
      border-color: #ff5a00;
    }
    .err {
      color: #ef4444;
      font-size: 0.8rem;
    }
    .acknowledgment-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .check-label {
      flex-direction: row;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
    }
    .check-label input {
      margin-top: 0.25rem;
      cursor: pointer;
    }
    .check-label span {
      line-height: 1.5;
      font-size: 0.88rem;
      color: #d1d5db;
    }
    .submit-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
    }
    .submit-btn {
      width: 100%;
      padding: 1rem;
      font-size: 1.05rem;
      font-weight: 600;
      background: #ff5a00;
      color: #fff;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(255, 90, 0, 0.3);
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .error-banner {
      color: #ef4444;
      font-size: 0.9rem;
      margin: 0;
    }
  `],
})
export class DeliveryOnboardingPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly agents = inject(DeliveryAgentDirectoryService);
  private readonly router = inject(Router);

  protected readonly user = this.session.user;
  protected loading = false;
  protected errorMessage = '';

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: ['', [Validators.required]],
    address: ['', [Validators.required]],
    zone: ['Central Zone', [Validators.required]],
    vehicleType: ['Electric Scooter', [Validators.required]],
    vehicleNumber: ['', [Validators.required]],
    drivingLicenseNumber: ['', [Validators.required]],
    payoutAccount: ['', [Validators.required]],
    acknowledged: [false, [Validators.requiredTrue]],
  });

  backToLogin(): void {
    this.session.clearSession();
    void this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const u = this.user();
    if (u) {
      const destination = this.session.routeAfterAuth(u);
      if (destination !== '/delivery/onboarding') {
        void this.router.navigateByUrl(destination);
        return;
      }
      this.form.patchValue({
        fullName: `${u.firstName} ${u.lastName ?? ''}`.trim() || u.username || '',
        phoneNumber: u.phoneNumber || '',
      });
    }
  }

  isTouchedAndInvalid(field: string): boolean {
    const c = this.form.get(field);
    return Boolean(c && c.touched && c.invalid);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete all required driver onboarding fields.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const raw = this.form.getRawValue();

    // 1. Submit onboarding status to backend auth service
    this.auth.submitOnboarding({
      vehicleType: raw.vehicleType,
      vehicleNumber: raw.vehicleNumber.trim().toUpperCase(),
      drivingLicenseNumber: raw.drivingLicenseNumber.trim().toUpperCase(),
      address: raw.address.trim(),
      notes: `Zone: ${raw.zone} | Payout: ${raw.payoutAccount}`,
    }).subscribe({
      next: () => {
        // Register in delivery agent directory
        this.agents.upsertAgent({
          name: raw.fullName.trim(),
          email: this.user()?.email || '',
          phone: raw.phoneNumber.trim(),
          zone: raw.zone,
          rating: '5.0 - New Partner',
          role: `${raw.vehicleType} - Delivery Partner`,
          initial: raw.fullName.trim().charAt(0).toUpperCase() || 'D',
          online: false,
          available: false,
          location: { lat: 28.5355, lng: 77.241, accuracy: 15 },
        });

        // 2. Refresh session user
        this.auth.getCurrentUser().subscribe({
          next: (updatedUser) => {
            this.session.replaceUser(updatedUser);
            this.loading = false;
            void this.router.navigate(['/approval-pending']);
          },
          error: () => {
            this.loading = false;
            void this.router.navigate(['/approval-pending']);
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.auth.authErrorMessage(err, 'Failed to submit onboarding. Please try again.');
      },
    });
  }
}
