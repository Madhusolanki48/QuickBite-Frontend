import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { CatalogService } from '../../services/catalog.service';
import { SessionService } from '../../services/session.service';

interface BannerPreset {
  label: string;
  cuisine: string;
  url: string;
}

@Component({
  selector: 'app-restaurant-onboarding-page',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, ReactiveFormsModule],
  template: `
    <div class="onboard-container">
      <div class="onboard-top-nav">
        <button type="button" class="back-link-btn" (click)="backToLogin()" title="Return to Sign In">
          <span class="back-arrow">←</span>
          <span>Back to Sign In</span>
        </button>
        <span class="top-nav-hint">Don't want to finish right now? You can sign back in anytime to continue.</span>
      </div>

      <div class="onboard-wrapper">
        <!-- Sidebar: Benefits & Steps -->
        <aside class="onboard-sidebar">
          <div class="sidebar-brand">
            <span class="brand-badge">QuickBite Partner Studio</span>
            <h2>Grow your restaurant business with QuickBite</h2>
            <p>Join over 6,000+ top kitchens delivering delicious meals to hungry foodies in your city.</p>
          </div>

          <div class="onboard-steps">
            <div class="step-item active">
              <span class="step-num">1</span>
              <div>
                <strong>Kitchen Profile</strong>
                <small>Basic details, address & working hours</small>
              </div>
            </div>
            <div class="step-item">
              <span class="step-num">2</span>
              <div>
                <strong>Menu Highlights</strong>
                <small>Signature dishes & pricing</small>
              </div>
            </div>
            <div class="step-item">
              <span class="step-num">3</span>
              <div>
                <strong>Verification & Launch</strong>
                <small>Admin approval within 24 hours</small>
              </div>
            </div>
          </div>

          <div class="perks-card">
            <h4>Merchant Benefits</h4>
            <ul>
              <li><span>✓</span> 0% commission on all orders for your first 30 days</li>
              <li><span>✓</span> Dedicated on-demand delivery rider fleet</li>
              <li><span>✓</span> Live kitchen order management cockpit</li>
              <li><span>✓</span> Automated daily payouts with instant statements</li>
            </ul>
          </div>

          <div class="sidebar-support">
            <span>Need help with onboarding?</span>
            <strong>support@quickbite.dev &bull; +91 1800 200 4000</strong>
          </div>
        </aside>

        <!-- Main Form -->
        <main class="onboard-card">
          <header class="onboard-head">
            <div class="badge">Merchant Onboarding</div>
            <h1>Partner Kitchen Registration</h1>
            <p>Complete your restaurant profile and initial menu highlights to submit for administrative verification.</p>
          </header>

          <!-- Rejection Notice if resubmitting -->
          <div *ngIf="user()?.approvalStatus === 'REJECTED'" class="rejection-alert">
            <div class="alert-icon">⚠️</div>
            <div>
              <strong>Application Needs Revision</strong>
              <p>Admin feedback: {{ user()?.rejectionReason || 'Please update your details and resubmit.' }}</p>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="onboard-form" autocomplete="off">
            <!-- Step 1: Restaurant Basic Info -->
            <section class="form-section">
              <h3 class="section-title">1. Kitchen Details</h3>

              <div class="form-row">
                <label>
                  Restaurant / Kitchen Name *
                  <input
                    formControlName="name"
                    placeholder="e.g. Bella Italia Trattoria"
                  />
                  <small *ngIf="isTouchedAndInvalid('name')" class="err">Restaurant name is required.</small>
                </label>

                <label>
                  Cuisine Type *
                  <select formControlName="cuisine">
                    <option value="">Select Primary Cuisine</option>
                    <option value="Italian & Pizza">Italian & Pizza</option>
                    <option value="Burgers & Fast Food">Burgers & Fast Food</option>
                    <option value="North Indian & Mughlai">North Indian & Mughlai</option>
                    <option value="Chinese & Pan-Asian">Chinese & Pan-Asian</option>
                    <option value="Healthy & Salads">Healthy & Salads</option>
                    <option value="Bakery & Desserts">Bakery & Desserts</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Biryani & Kebabs">Biryani & Kebabs</option>
                  </select>
                  <small *ngIf="isTouchedAndInvalid('cuisine')" class="err">Please select a cuisine.</small>
                </label>
              </div>

              <div class="form-row">
                <label>
                  Kitchen Address & Area *
                  <input
                    formControlName="address"
                    placeholder="e.g. Shop 14, High Street Mall, Sector 29"
                  />
                  <small *ngIf="isTouchedAndInvalid('address')" class="err">Address is required.</small>
                </label>

                <label>
                  Contact Phone Number *
                  <input
                    formControlName="phoneNumber"
                    placeholder="10-digit contact number"
                  />
                  <small *ngIf="isTouchedAndInvalid('phoneNumber')" class="err">Valid phone number required.</small>
                </label>
              </div>

              <div class="form-row three">
                <label>
                  Avg. Prep & Delivery (mins)
                  <input formControlName="deliveryMinutes" type="number" min="10" max="90" />
                </label>
                <label>
                  Minimum Order (₹)
                  <input formControlName="minOrder" type="number" min="0" max="1000" />
                </label>
                <label>
                  Operational Hours
                  <input formControlName="hours" placeholder="e.g. 10:00 AM - 11:00 PM" />
                </label>
              </div>

              <label>
                Restaurant Bio / Specialty
                <textarea
                  formControlName="description"
                  rows="2"
                  placeholder="Share what makes your kitchen special (e.g. Authentic hand-tossed sourdough crusts and fresh mozzarella)..."
                ></textarea>
              </label>

              <!-- Banner Image Selection -->
              <div class="banner-picker">
                <span class="field-label">Choose Kitchen Banner Style</span>
                <div class="presets-grid">
                  <div
                    *ngFor="let p of bannerPresets"
                    class="preset-card"
                    [class.selected]="form.value.imageUrl === p.url"
                    (click)="form.patchValue({ imageUrl: p.url })"
                  >
                    <img [src]="p.url" [alt]="p.label" />
                    <span>{{ p.label }}</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Step 2: Initial Menu Items -->
            <section class="form-section">
              <div class="section-head-row">
                <h3 class="section-title">2. Initial Menu Items (Optional)</h3>
                <button type="button" class="btn-ghost" (click)="addMenuItem()">+ Add Item</button>
              </div>
              <p class="section-desc">You can add your signature dishes now or add more later from the Menu Manager.</p>

              <div formArrayName="menuItems" class="menu-items-list">
                <div
                  *ngFor="let itemForm of menuItemsArray.controls; let idx = index"
                  [formGroupName]="idx"
                  class="item-card"
                >
                  <div class="item-grid">
                    <label>
                      Dish Name
                      <input formControlName="name" placeholder="e.g. Truffle Margherita" />
                    </label>
                    <label>
                      Price (₹)
                      <input formControlName="price" type="number" placeholder="299" />
                    </label>
                    <label>
                      Dietary
                      <select formControlName="isVeg">
                        <option [value]="true">🟢 Vegetarian</option>
                        <option [value]="false">🔴 Non-Veg</option>
                      </select>
                    </label>
                    <div class="remove-col">
                      <button
                        type="button"
                        class="btn-remove"
                        (click)="removeMenuItem(idx)"
                        title="Remove Item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Submit Button & Feedback -->
            <div class="submit-actions">
              <button
                type="submit"
                class="primary submit-btn"
                [disabled]="loading"
              >
                {{ loading ? 'Submitting Application...' : 'Submit Kitchen for Admin Verification' }}
              </button>
              <p *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</p>
            </div>
          </form>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .onboard-container {
      min-height: 100vh;
      width: 100%;
      background: radial-gradient(circle at 10% 20%, rgba(255, 90, 0, 0.12), transparent 45%), #0c0d12;
      padding: clamp(1.25rem, 2.5vw, 2.5rem) clamp(1rem, 2vw, 2rem);
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #f3f4f6;
      box-sizing: border-box;
    }
    .onboard-top-nav {
      width: 100%;
      max-width: 1360px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
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
    .onboard-wrapper {
      width: 100%;
      max-width: 1360px;
      display: grid;
      grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
      gap: 2rem;
      align-items: start;
    }
    .onboard-sidebar {
      background: rgba(20, 22, 29, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      position: sticky;
      top: 1.5rem;
    }
    .brand-badge {
      display: inline-block;
      padding: 0.3rem 0.85rem;
      background: rgba(255, 90, 0, 0.15);
      color: #ff5a00;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      margin-bottom: 0.75rem;
    }
    .sidebar-brand h2 {
      font-size: 1.6rem;
      line-height: 1.25;
      margin: 0 0 0.5rem 0;
      color: #fff;
    }
    .sidebar-brand p {
      color: #9ca3af;
      font-size: 0.92rem;
      line-height: 1.5;
      margin: 0;
    }
    .onboard-steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      opacity: 0.6;
    }
    .step-item.active {
      opacity: 1;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: #fff;
    }
    .step-item.active .step-num {
      background: #ff5a00;
      color: #fff;
    }
    .step-item div strong {
      display: block;
      font-size: 0.9rem;
      color: #fff;
    }
    .step-item div small {
      display: block;
      font-size: 0.78rem;
      color: #9ca3af;
    }
    .perks-card {
      background: linear-gradient(135deg, rgba(255, 90, 0, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 90, 0, 0.2);
      border-radius: 14px;
      padding: 1.25rem;
    }
    .perks-card h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.95rem;
      color: #ff8a3d;
    }
    .perks-card ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .perks-card li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #d1d5db;
      line-height: 1.4;
    }
    .perks-card li span {
      color: #ff5a00;
      font-weight: 800;
    }
    .sidebar-support {
      font-size: 0.82rem;
      color: #9ca3af;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 1rem;
    }
    .sidebar-support strong {
      display: block;
      color: #e5e7eb;
      margin-top: 0.2rem;
    }
    .onboard-card {
      width: 100%;
      background: rgba(20, 22, 29, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: clamp(1.5rem, 3vw, 2.75rem);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      box-sizing: border-box;
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
      font-size: clamp(1.6rem, 2.5vw, 2.2rem);
      margin: 0 0 0.5rem 0;
      color: #fff;
      line-height: 1.2;
    }
    .onboard-head p {
      color: #9ca3af;
      margin: 0;
      font-size: 0.98rem;
      line-height: 1.5;
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
    .section-head-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-desc {
      color: #9ca3af;
      font-size: 0.88rem;
      margin: -0.5rem 0 1.25rem 0;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.25rem;
    }
    .form-row.three {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    @media (max-width: 990px) {
      .onboard-wrapper {
        grid-template-columns: 1fr;
      }
      .onboard-sidebar {
        position: static;
      }
    }
    @media (max-width: 680px) {
      .form-row, .form-row.three {
        grid-template-columns: 1fr;
      }
      .item-grid {
        grid-template-columns: 1fr !important;
      }
      .btn-remove {
        margin-top: 0.25rem !important;
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
    input, select, textarea {
      width: 100%;
      box-sizing: border-box;
      background: rgba(15, 17, 23, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus {
      border-color: #ff5a00;
    }
    .err {
      color: #ef4444;
      font-size: 0.8rem;
    }
    .banner-picker {
      margin-top: 1.25rem;
    }
    .field-label {
      display: block;
      font-size: 0.88rem;
      color: #d1d5db;
      margin-bottom: 0.75rem;
      font-weight: 500;
    }
    .presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.75rem;
    }
    .preset-card {
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
      background: rgba(0, 0, 0, 0.3);
    }
    .preset-card img {
      width: 100%;
      height: 70px;
      object-fit: cover;
      display: block;
    }
    .preset-card span {
      display: block;
      padding: 0.35rem 0.25rem;
      font-size: 0.75rem;
      color: #d1d5db;
    }
    .preset-card.selected {
      border-color: #ff5a00;
      background: rgba(255, 90, 0, 0.1);
    }
    .preset-card.selected span {
      color: #ff5a00;
      font-weight: 600;
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid rgba(255, 90, 0, 0.4);
      color: #ff5a00;
      padding: 0.4rem 0.9rem;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .menu-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .item-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 1rem;
    }
    .item-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1.2fr 40px;
      gap: 0.75rem;
      align-items: center;
    }
    .btn-remove {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-top: 1.25rem;
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
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
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
export class RestaurantOnboardingPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly user = this.session.user;
  protected loading = false;
  protected errorMessage = '';

  protected readonly bannerPresets: BannerPreset[] = [
    { label: 'Pizza & Italian', cuisine: 'Italian', url: '/assets/images/restaurants/pizza-hut.jpg' },
    { label: 'Burgers & Grill', cuisine: 'Burgers', url: '/assets/images/restaurants/burger-palace.jpg' },
    { label: 'Asian & Wok', cuisine: 'Asian', url: '/assets/images/restaurants/dragon-wok.jpg' },
    { label: 'Greens & Bowls', cuisine: 'Healthy', url: '/assets/images/restaurants/green-bowl.jpg' },
    { label: 'Indian Spice', cuisine: 'Indian', url: '/assets/images/restaurants/spice-kitchen.jpg' },
    { label: 'Urban Cafe', cuisine: 'Cafe', url: '/assets/images/restaurants/urban-cafe.jpg' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    cuisine: ['', [Validators.required]],
    address: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    deliveryMinutes: [30, [Validators.required]],
    minOrder: [150, [Validators.required]],
    hours: ['10:00 AM - 11:00 PM'],
    description: [''],
    imageUrl: ['/assets/images/restaurants/pizza-hut.jpg'],
    menuItems: this.fb.array<FormGroup>([]),
  });

  get menuItemsArray(): FormArray {
    return this.form.get('menuItems') as FormArray;
  }

  backToLogin(): void {
    this.session.clearSession();
    void this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const u = this.user();
    if (u) {
      const destination = this.session.routeAfterAuth(u);
      if (destination !== '/owner/onboarding') {
        void this.router.navigateByUrl(destination);
        return;
      }
      if (u.phoneNumber) {
        this.form.patchValue({ phoneNumber: u.phoneNumber });
      }
      if (u.restaurantName) {
        this.form.patchValue({ name: u.restaurantName });
      }
    }
    // Add default initial menu item row
    this.addMenuItem('Signature Dish', 299, true);
  }

  addMenuItem(name = '', price = 199, isVeg = true): void {
    const itemGroup = this.fb.group({
      name: [name, Validators.required],
      price: [price, [Validators.required, Validators.min(10)]],
      isVeg: [isVeg],
    });
    this.menuItemsArray.push(itemGroup);
  }

  removeMenuItem(index: number): void {
    if (this.menuItemsArray.length > 1) {
      this.menuItemsArray.removeAt(index);
    }
  }

  isTouchedAndInvalid(field: string): boolean {
    const c = this.form.get(field);
    return Boolean(c && c.touched && c.invalid);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete all required kitchen fields.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const raw = this.form.getRawValue();
    const cleanName = (raw.name || '').trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const u = this.user();

    // 1. Submit onboarding state to backend auth service
    this.auth.submitOnboarding({
      restaurantName: cleanName,
      cuisineType: raw.cuisine || undefined,
      address: (raw.address || '').trim(),
      notes: raw.description || undefined,
    }).subscribe({
      next: () => {
        // 2. Add restaurant to catalog service
        this.catalog.addRestaurant({
          id: slug,
          name: cleanName,
          cuisine: raw.cuisine || 'Fast Food',
          category: 'quick-bites',
          rating: 4.8,
          deliveryMinutes: `${raw.deliveryMinutes || 30} mins`,
          minOrder: raw.minOrder || 150,
          status: 'OPEN',
          heroEmoji: '🍽️',
          description: raw.description || 'Artisanal kitchen offering gourmet comfort dining.',
          imageUrl: raw.imageUrl || undefined,
        }, {
          ownerId: u?.id,
          ownerEmail: u?.email,
          ownerName: `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || cleanName,
        });

        // 3. Add initial menu items if defined
        const items = raw.menuItems || [];
        items.forEach((item: any, i: number) => {
          if (item.name) {
            this.catalog.addMenuItem({
              id: `${slug}-item-${i + 1}`,
              restaurantId: slug,
              name: item.name,
              category: 'Specials',
              price: item.price,
              isVeg: item.isVeg,
              icon: item.isVeg ? '🥗' : '🍗',
              description: `Freshly prepared ${item.name}`,
              rating: 4.8,
              imageUrl: raw.imageUrl || undefined,
            });
          }
        });

        // 4. Refresh session to update onboardingStatus & approvalStatus
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
