import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concatMap, filter, from, of, take, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

export interface RazorpayCreateOrderRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayCreateOrderResponse {
  orderId?: string;
  razorpayOrderId?: string;
  id?: string;
  amount?: number;
  amountInPaise?: number;
  currency?: string;
  keyId?: string;
  receipt?: string;
}

export interface RazorpayVerifyRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RazorpayVerifyResponse {
  verified?: boolean;
  success?: boolean;
  message?: string;
  paymentId?: string;
  razorpayPaymentId?: string;
  orderId?: string;
  razorpayOrderId?: string;
  signature?: string;
  razorpaySignature?: string;
}

export interface RazorpayCheckoutSuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  config?: {
    display?: {
      sequence?: string[];
    };
  };
  handler?: (response: RazorpayCheckoutSuccess) => void;
}

interface RazorpayInstance {
  open(): void;
  on?(event: string, callback: () => void): void;
}

interface RazorpayWindow {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayWindow;
  }
}

@Injectable({ providedIn: 'root' })
export class RazorpayService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private checkoutScriptPromise?: Promise<void>;
  private readonly createOrderPaths = [
    '/payment/create-order',
    '/payments/create-order',
    '/create-order',
  ];
  private readonly verifyPaths = ['/payment/verify', '/payments/verify', '/verify'];

  loadCheckoutScript(): Promise<void> {
    if (window.Razorpay) {
      return Promise.resolve();
    }

    if (!this.checkoutScriptPromise) {
      this.checkoutScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
        document.body.appendChild(script);
      });
    }

    return this.checkoutScriptPromise;
  }

  createOrder(request: RazorpayCreateOrderRequest): Observable<RazorpayCreateOrderResponse> {
    return from(this.createOrderPaths).pipe(
      concatMap((path) =>
        this.http.post<RazorpayCreateOrderResponse>(`${this.baseUrl}${path}`, request).pipe(
          catchError((error) => (this.isNotFound(error) ? of(null) : throwError(() => error))),
        ),
      ),
      filter((response): response is RazorpayCreateOrderResponse => response !== null),
      take(1),
    );
  }

  verifyPayment(request: RazorpayVerifyRequest): Observable<RazorpayVerifyResponse> {
    return from(this.verifyPaths).pipe(
      concatMap((path) =>
        this.http.post<RazorpayVerifyResponse>(`${this.baseUrl}${path}`, request).pipe(
          catchError((error) => (this.isNotFound(error) ? of(null) : throwError(() => error))),
        ),
      ),
      filter((response): response is RazorpayVerifyResponse => response !== null),
      take(1),
    );
  }

  openCheckout(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutSuccess> {
    return new Promise((resolve, reject) => {
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        reject(new Error('Razorpay checkout is not available.'));
        return;
      }

      const instance = new RazorpayCtor({
        ...options,
        handler: (response) => resolve(response),
        modal: {
          ...(options.modal ?? {}),
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
      });

      if (instance.on) {
        instance.on('payment.failed', () => reject(new Error('Payment failed')));
      }

      instance.open();
    });
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      const backendMessage =
        typeof body === 'string'
          ? body
          : body?.message || body?.error || body?.detail || body?.title || '';
      if (
        (error.status === 500 || error.status === 503) &&
        backendMessage.toLowerCase().includes('razorpay key_id/key_secret')
      ) {
        return 'Razorpay is not configured in the running API gateway. Restart the gateway after loading RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.';
      }
      if (backendMessage) {
        return backendMessage;
      }
      if (error.status === 0) {
        return 'Could not reach the backend. Please check the server and proxy.';
      }
      if (error.status === 503) {
        return 'Razorpay is not configured on the backend. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the API gateway environment, then restart it.';
      }
      return `Payment request failed (${error.status}).`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to complete payment. Please try again.';
  }
}
