import { Injectable } from '@angular/core';

const LEAFLET_CSS_ID = 'quickbite-leaflet-css';
const LEAFLET_SCRIPT_ID = 'quickbite-leaflet-script';
const LEAFLET_CSS_HREF = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_SCRIPT_SRC = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

@Injectable({ providedIn: 'root' })
export class LeafletLoaderService {
  private loadPromise?: Promise<void>;

  load(): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    const globalWindow = window as Window & { L?: unknown };
    if (globalWindow.L) {
      return Promise.resolve();
    }

    this.ensureCss();

    if (!this.loadPromise) {
      this.loadPromise = new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(new Error('Leaflet failed to load')), {
            once: true,
          });
          return;
        }

        const script = document.createElement('script');
        script.id = LEAFLET_SCRIPT_ID;
        script.src = LEAFLET_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Leaflet failed to load'));
        document.head.appendChild(script);
      });
    }

    return this.loadPromise;
  }

  private ensureCss(): void {
    if (document.getElementById(LEAFLET_CSS_ID)) {
      return;
    }

    const link = document.createElement('link');
    link.id = LEAFLET_CSS_ID;
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_HREF;
    document.head.appendChild(link);
  }
}
