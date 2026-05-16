import { NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { SessionService } from '../../services/session.service';

const GOOGLE_CLIENT_ID = '657167715760-nl47ceicarqnu2q296mpl2fmm3oubh5t.apps.googleusercontent.com';

@Component({
  selector: 'app-login-page',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card auth-card auth-card--wide">
      <div class="auth-card__backdrop"></div>
      <div *ngIf="toastMessage" class="toast" [class.toast--error]="toastTone === 'error'">
        {{ toastMessage }}
      </div>

      <div class="auth-card__header">
        <p class="eyebrow">Welcome back</p>
        <h2>Login to continue</h2>
        <p>Sign in with email/password or continue with Google.</p>
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

        <div class="form-row form-row--actions">
          <a class="helper-link helper-link--right" routerLink="/forgot-password">Forgot Password?</a>
        </div>

        <button class="primary login-cta" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Signing in...' : 'Login' }}
        </button>

        <div class="auth-divider"><span>or continue with</span></div>

        <div class="google-button" #googleButtonHost></div>

        <p class="helper helper--signup">
          Don't have an account? <a routerLink="/sign-in">Sign Up</a>
        </p>

        <p *ngIf="message" class="message">{{ message }}</p>
      </form>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class LoginPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private toastTimer?: ReturnType<typeof setTimeout>;

  @ViewChild('googleButtonHost', { static: true })
  private readonly googleButtonHost!: ElementRef<HTMLDivElement>;

  protected loading = false;
  protected message = '';
  protected toastMessage = '';
  protected toastTone: 'success' | 'error' | 'info' = 'info';
  protected emailLocked = true;
  protected passwordLocked = true;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    if (query.get('logout') === '1') {
      this.showToast('You have been logged out successfully.', 'success');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
    if (query.get('verified') === '1' && query.get('pendingApproval') === '1') {
      this.message = 'Your email is verified, and your account is waiting for admin approval.';
    } else if (query.get('verified') === '1') {
      this.message = 'Your email has been verified. You can log in now.';
    } else if (query.get('reset') === '1') {
      this.message = 'Your password has been reset. Please log in again.';
    }
  }

  login(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.message = '';
    this.showToast('Signing in...', 'info');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.session.startSession(response);
        if (!response.token) {
          const destination = this.session.routeAfterAuth(response.user);
          if (destination === '/approval-pending') {
            this.showToast('Your account is verified, but it is waiting for admin approval.', 'info');
          } else {
            this.showToast('Login successful.', 'success');
          }
          this.loading = false;
          window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
          return;
        }

        this.auth.getCurrentUser().subscribe({
          next: (currentUser) => {
            this.session.replaceUser(currentUser);
            const destination = this.session.routeAfterAuth(currentUser);
            if (destination === '/approval-pending') {
              this.showToast('Your account is verified, but it is waiting for admin approval.', 'info');
            } else {
              this.showToast('Login successful.', 'success');
            }
            this.loading = false;
            window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
          },
          error: () => {
            const destination = this.session.routeAfterAuth(response.user);
            this.showToast('Login successful.', 'success');
            this.loading = false;
            window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
          },
        });
      },
      error: (error) => {
        this.message = this.auth.authErrorMessage(error, 'Login failed. Please try again.');
        this.showToast(this.message, 'error');
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

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
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
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: Math.max(300, Math.min(420, hostWidth)),
      });
    });
  }

  private handleGoogleCredential(credential: string): void {
    this.loading = true;
    this.message = '';
    this.showToast('Signing in...', 'info');
    this.auth.googleLogin({ credential }).subscribe({
      next: (response) => {
        this.session.startSession(response);
        if (!response.token) {
          const destination = this.session.routeAfterAuth(response.user);
          if (destination === '/approval-pending') {
            this.showToast('Your account is verified, but it is waiting for admin approval.', 'info');
          } else {
            this.showToast('Login successful.', 'success');
          }
          this.loading = false;
          window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
          return;
        }

        this.auth.getCurrentUser().subscribe({
          next: (currentUser) => {
            this.session.replaceUser(currentUser);
            const destination = this.session.routeAfterAuth(currentUser);
            if (destination === '/approval-pending') {
              this.showToast('Your account is verified, but it is waiting for admin approval.', 'info');
            } else {
              this.showToast('Login successful.', 'success');
            }
            this.loading = false;
            window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
          },
          error: () => {
            const destination = this.session.routeAfterAuth(response.user);
            this.showToast('Login successful.', 'success');
            this.loading = false;
            window.setTimeout(() => void this.router.navigateByUrl(destination), 250);
          },
        });
      },
      error: (error) => {
        this.message = this.auth.authErrorMessage(error, 'Google auth failed. Please try again.');
        this.showToast(this.message, 'error');
        this.loading = false;
      },
    });
  }

  private showToast(message: string, tone: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastTone = tone;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      if (this.toastMessage === message) {
        this.toastMessage = '';
      }
    }, 2200);
  }
}
