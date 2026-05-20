import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth-layout">
      <div class="auth-hero">
        <div class="auth-hero__copy">
          <div class="auth-hero__badge">
            <img src="/assets/images/logo/white-logo-64.png" width="32" height="32" alt="QuickBite logo" />
            <span>QuickBite</span>
          </div>
          <h1>Fast food ordering.</h1>
          <p>Sign in, pick a role, and keep moving.</p>
        </div>
      </div>
      <div class="auth-stage">
        <router-outlet />
      </div>
    </div>
  `,
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {}
