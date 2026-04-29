import { NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { SessionService } from '../../services/session.service';

const GOOGLE_CLIENT_ID = '657167715760-nl47ceicarqnu2q296mpl2fmm3oubh5t.apps.googleusercontent.com';

@Component({
  selector: 'app-login-page',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card auth-card">
      <div class="auth-card__header">
        <p class="eyebrow">Welcome back</p>
        <h2>Login to continue to your home page.</h2>
        <p>Sign in with email/password or use Google auth to enter the customer workflow.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="login()" class="form" autocomplete="off">
        <label>
          Email
          <input
            formControlName="email"
            [readOnly]="emailLocked"
            (focus)="emailLocked = false"
            autocomplete="off"
            spellcheck="false"
            autocapitalize="off"
            placeholder="Enter your registered email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            formControlName="password"
            [readOnly]="passwordLocked"
            (focus)="passwordLocked = false"
            autocomplete="off"
            placeholder="Enter your password"
          />
        </label>

        <button class="primary" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Signing in...' : 'Login' }}
        </button>

        <div class="auth-divider"><span>or</span></div>

        <div class="google-button" #googleButtonHost></div>

        <p class="helper">New here? <a routerLink="/sign-in">Create an account first</a></p>

        <p *ngIf="message" class="message">{{ message }}</p>
      </form>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  @ViewChild('googleButtonHost', { static: true })
  private readonly googleButtonHost!: ElementRef<HTMLDivElement>;

  protected loading = false;
  protected message = '';
  protected emailLocked = true;
  protected passwordLocked = true;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  login(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.message = '';
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.session.startSession(response);
        void this.router.navigateByUrl(this.session.dashboardRouteFor(response.user.role));
      },
      error: () => {
        this.message = 'Login failed. Please try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  googleLogin(): void {
    // This is now handled by Google Identity Services.
  }

  ngAfterViewInit(): void {
    void this.loadGoogleScript();
  }

  private async loadGoogleScript(): Promise<void> {
    const googleGlobal = (window as any).google;
    if (googleGlobal?.accounts?.id) {
      this.renderGoogleButton();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-qb-gis="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google script failed')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['qbGis'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google script failed'));
      document.head.appendChild(script);
    }).catch(() => {
      this.message = 'Google sign-in could not load. Please check network access.';
    });

    this.renderGoogleButton();
  }

  private renderGoogleButton(): void {
    const google = (window as any).google;
    if (!google?.accounts?.id || !this.googleButtonHost?.nativeElement) {
      return;
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) =>
        this.handleGoogleCredential(response.credential),
    });

    this.googleButtonHost.nativeElement.innerHTML = '';
    requestAnimationFrame(() => {
      const hostWidth =
        this.googleButtonHost.nativeElement.parentElement?.clientWidth ??
        this.googleButtonHost.nativeElement.clientWidth ??
        360;
      google.accounts.id.renderButton(this.googleButtonHost.nativeElement, {
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: Math.max(320, hostWidth),
      });
    });
  }

  private handleGoogleCredential(credential: string): void {
    this.loading = true;
    this.message = '';
    this.auth.googleLogin({ credential }).subscribe({
      next: (response) => {
        this.session.startSession(response);
        void this.router.navigateByUrl(this.session.dashboardRouteFor(response.user.role));
      },
      error: () => {
        this.message = 'Google auth failed. Please try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
