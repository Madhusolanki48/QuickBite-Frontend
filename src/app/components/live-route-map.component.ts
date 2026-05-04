import { NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';

import { GeoPoint } from '../core/app.models';
import { LeafletLoaderService } from '../services/leaflet-loader.service';

declare const L: any;

@Component({
  selector: 'app-live-route-map',
  imports: [NgIf],
  template: `
    <section class="card live-route-map">
      <div class="live-route-map__header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <span *ngIf="status" class="live-route-map__status">{{ status }}</span>
      </div>

      <div #mapHost class="live-route-map__frame"></div>
    </section>
  `,
  styleUrl: './live-route-map.component.scss'
})
export class LiveRouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = 'Live Delivery Route';
  @Input() subtitle = 'OpenStreetMap + Leaflet + OSRM';
  @Input() status = '';
  @Input() pickup: GeoPoint | null = null;
  @Input() drop: GeoPoint | null = null;
  @Input() agent: GeoPoint | null = null;
  @Input() routeStart: GeoPoint | null = null;
  @Input() routeEnd: GeoPoint | null = null;

  @ViewChild('mapHost', { static: true }) private readonly mapHost!: ElementRef<HTMLDivElement>;

  private readonly loader = inject(LeafletLoaderService);
  private map: any;
  private routeLayer: any;
  private markerLayer: any[] = [];
  private viewReady = false;
  private renderToken = 0;

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.renderMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && Object.keys(changes).length > 0) {
      void this.renderMap();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private async renderMap(): Promise<void> {
    const token = ++this.renderToken;
    await this.loader.load();
    if (token !== this.renderToken) {
      return;
    }

    if (!this.map) {
      this.map = L.map(this.mapHost.nativeElement, {
        zoomControl: true,
        scrollWheelZoom: false
      }).setView(this.centerPoint(), 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);
    }

    this.clearLayers();

    const start = this.routeStart ?? this.pickup ?? this.agent;
    const end = this.routeEnd ?? this.drop;
    const markers = [
      { point: this.pickup, color: '#ff6a00', label: 'Pickup' },
      { point: this.drop, color: '#16b67a', label: 'Drop' },
      { point: this.agent, color: '#2563eb', label: 'Agent' }
    ];

    const visiblePoints: GeoPoint[] = [];
    for (const marker of markers) {
      if (marker.point) {
        visiblePoints.push(marker.point);
        this.markerLayer.push(
          L.marker([marker.point.lat, marker.point.lng], {
            icon: this.buildIcon(marker.color, marker.label)
          }).addTo(this.map)
        );
      }
    }

    if (start && end) {
      visiblePoints.push(start, end);
      const path = await this.fetchRoute(start, end).catch(() => null);
      if (token !== this.renderToken) {
        return;
      }

      if (path?.length) {
        this.routeLayer = L.polyline(path, {
          color: '#ff5a00',
          weight: 5,
          opacity: 0.9
        }).addTo(this.map);
      } else {
        this.routeLayer = L.polyline(
          [
            [start.lat, start.lng],
            [end.lat, end.lng]
          ],
          {
            color: '#ff5a00',
            weight: 4,
            dashArray: '8 10'
          }
        ).addTo(this.map);
      }
    }

    const bounds = visiblePoints.length
      ? L.latLngBounds(visiblePoints.map((point) => [point.lat, point.lng]))
      : null;
    if (bounds) {
      this.map.fitBounds(bounds.pad(0.2));
    } else {
      this.map.setView(this.centerPoint(), 12);
    }
  }

  private centerPoint(): [number, number] {
    const point = this.routeStart ?? this.pickup ?? this.drop ?? this.agent ?? { lat: 28.6139, lng: 77.209 };
    return [point.lat, point.lng];
  }

  private clearLayers(): void {
    this.routeLayer?.remove();
    this.routeLayer = null;
    for (const marker of this.markerLayer) {
      marker.remove();
    }
    this.markerLayer = [];
  }

  private buildIcon(color: string, label: string): any {
    return L.divIcon({
      className: 'quickbite-map-icon',
      html: `<span style="background:${color};width:34px;height:34px;border-radius:999px;display:grid;place-items:center;color:#fff;font-weight:800;box-shadow:0 8px 18px rgba(0,0,0,0.18)">${label.charAt(0)}</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 30]
    });
  }

  private async fetchRoute(start: GeoPoint, end: GeoPoint): Promise<Array<[number, number]>> {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };
    const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];
    return coordinates.map(([lng, lat]) => [lat, lng]);
  }
}
