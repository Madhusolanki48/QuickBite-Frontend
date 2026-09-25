function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080/api';
    }
  }
  return 'https://booth-salad-specimen.ngrok-free.dev/api';
}

export const environment = {
  get apiBaseUrl(): string {
    return resolveBaseUrl();
  },
  get authApiBaseUrl(): string {
    return resolveBaseUrl();
  },
  googleClientId: '657167715760-nl47ceicarqnu2q296mpl2fmm3oubh5t.apps.googleusercontent.com',
  razorpayKeyId: 'rzp_test_SqXwl49TkrLtMd',
};
