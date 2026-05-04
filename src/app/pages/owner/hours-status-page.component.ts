import { NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';

import { OwnerDashboardService } from '../../services/owner-dashboard.service';

@Component({
  selector: 'app-hours-status-page',
  imports: [NgFor],
  template: `
    <section class="page-head">
      <div>
        <h1>Hours & Status</h1>
        <p>
          Toggle to open or close instantly. Customers can only order when the restaurant is open.
        </p>
      </div>
      <div class="owner-toolbar">
        <span
          class="owner-status"
          [style.background]="dashboard.restaurantProfile().open ? '#e6f7e9' : '#f1f2f6'"
        >
          {{ dashboard.restaurantProfile().open ? '● Currently Open' : '● Currently Closed' }}
        </span>
        <button
          class="toggle"
          type="button"
          [class.off]="!dashboard.restaurantProfile().open"
          (click)="toggle()"
        ></button>
      </div>
    </section>

    <section class="card section-card">
      <h2>Operating Hours</h2>
      <p
        class="save-note"
        [attr.title]="
          dashboard.restaurantProfile().open
            ? 'Customers can order now'
            : 'Customers cannot order until reopened'
        "
      >
        {{
          dashboard.restaurantProfile().open ? 'Open - accepting orders' : 'Closed - orders paused'
        }}
      </p>
      <table class="hours-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Open</th>
            <th>Close</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of dashboard.schedule()">
            <td>
              <strong>{{ row.day }}</strong>
            </td>
            <td>
              <input
                class="time-box time-input"
                [value]="row.open"
                (input)="updateHour(row.day, 'open', $any($event.target).value)"
              />
            </td>
            <td>
              <input
                class="time-box time-input"
                [value]="row.close"
                (input)="updateHour(row.day, 'close', $any($event.target).value)"
              />
            </td>
            <td>
              <button
                class="small-switch"
                type="button"
                [class.off]="!row.openToday"
                (click)="toggleDay(row.day, row.openToday)"
              ></button>
            </td>
          </tr>
        </tbody>
      </table>
      <button class="save-btn" type="button" (click)="saveSchedule()">Save Schedule</button>
    </section>
  `,
  styleUrl: './owner-pages.scss',
})
export class HoursStatusPageComponent {
  protected readonly dashboard = inject(OwnerDashboardService);

  toggle(): void {
    this.dashboard.updateRestaurantOpen(!this.dashboard.restaurantProfile().open);
  }

  toggleDay(day: string, current: boolean): void {
    this.dashboard.updateHours(day, { openToday: !current });
  }

  updateHour(day: string, field: 'open' | 'close', value: string): void {
    this.dashboard.updateHours(day, { [field]: value } as Partial<{
      open: string;
      close: string;
      openToday: boolean;
    }>);
  }

  saveSchedule(): void {
    this.dashboard.saveSchedule();
  }
}
