import { Injectable } from '@angular/core';

import { Address, GeoPoint } from '../core/app.models';

const DELHI_CENTER: GeoPoint = { lat: 28.6139, lng: 77.209 };

const RESTAURANT_LOCATIONS: Record<string, GeoPoint> = {
  'burger-palace': { lat: 28.5434, lng: 77.2476 },
  'pizza-hut-express': { lat: 28.5543, lng: 77.2177 },
  'sushi-zen': { lat: 28.5672, lng: 77.2365 },
  'spice-garden': { lat: 28.5463, lng: 77.1988 },
  'taco-fiesta': { lat: 28.4972, lng: 77.0826 },
  'noodle-house': { lat: 28.4676, lng: 77.0249 },
};

const KNOWN_ADDRESSES: Array<{ match: RegExp; point: GeoPoint }> = [
  { match: /green park extension/i, point: { lat: 28.5598, lng: 77.2065 } },
  { match: /cyber city/i, point: { lat: 28.4951, lng: 77.0888 } },
  { match: /new delhi/i, point: { lat: 28.6139, lng: 77.209 } },
  { match: /gurugram/i, point: { lat: 28.4595, lng: 77.0266 } },
];

@Injectable({ providedIn: 'root' })
export class LocationService {
  restaurantLocation(restaurantId: string): GeoPoint {
    return RESTAURANT_LOCATIONS[restaurantId] ?? DELHI_CENTER;
  }

  addressLocation(address: Address | string): GeoPoint {
    const text = typeof address === 'string' ? address : `${address.title} ${address.addressLine}`;
    const known = KNOWN_ADDRESSES.find((entry) => entry.match.test(text));
    if (known) {
      return known.point;
    }

    return this.hashPoint(text);
  }

  private hashPoint(input: string): GeoPoint {
    let hash = 0;
    for (const char of input.toLowerCase()) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    const latOffset = ((hash & 0xff) - 128) / 2500;
    const lngOffset = (((hash >> 8) & 0xff) - 128) / 2500;
    return {
      lat: Number((DELHI_CENTER.lat + latOffset).toFixed(6)),
      lng: Number((DELHI_CENTER.lng + lngOffset).toFixed(6)),
    };
  }
}
