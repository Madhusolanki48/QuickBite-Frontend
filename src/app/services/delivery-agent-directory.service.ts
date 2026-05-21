import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { RealtimeSyncService } from './realtime-sync.service';
import { SessionService } from './session.service';
import { DeliveryAgentDirectoryEntry } from './delivery-agents.data';

const DIRECTORY_KEY = 'quickbite.delivery.agents.directory';

@Injectable({ providedIn: 'root' })
export class DeliveryAgentDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly sync = inject(RealtimeSyncService);
  private readonly session = inject(SessionService);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly agentsSignal = signal<DeliveryAgentDirectoryEntry[]>(this.readAgents());

  readonly agents = computed(() => this.agentsSignal());
  readonly availableAgents = computed(() =>
    this.agentsSignal().filter((agent) => agent.available && agent.online),
  );

  constructor() {
    this.sync.on(DIRECTORY_KEY, () => this.refresh());
    this.refreshFromBackend();
  }

  currentAgentEmail(): string {
    return this.session.user()?.email?.toLowerCase() ?? '';
  }

  currentAgent(): DeliveryAgentDirectoryEntry | null {
    const email = this.currentAgentEmail();
    return this.agentsSignal().find((agent) => agent.email.toLowerCase() === email) ?? null;
  }

  setCurrentAvailability(available: boolean): void {
    const email = this.currentAgentEmail();
    if (!email) {
      return;
    }
    this.setAvailability(email, available);
  }

  setAvailability(email: string, available: boolean): void {
    const normalized = email.toLowerCase();
    this.agentsSignal.update((agents) =>
      agents.map((agent) =>
        agent.email.toLowerCase() === normalized
          ? { ...agent, available, online: available }
          : agent,
      ),
    );
    this.persist();
  }

  assignableAgents(): DeliveryAgentDirectoryEntry[] {
    return this.availableAgents();
  }

  findAgent(email?: string | null): DeliveryAgentDirectoryEntry | null {
    if (!email) {
      return null;
    }
    return (
      this.agentsSignal().find((agent) => agent.email.toLowerCase() === email.toLowerCase()) ?? null
    );
  }

  private readAgents(): DeliveryAgentDirectoryEntry[] {
    const raw = localStorage.getItem(DIRECTORY_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as DeliveryAgentDirectoryEntry[];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(this.agentsSignal()));
    this.sync.publish(DIRECTORY_KEY);
  }

  private refresh(): void {
    this.agentsSignal.set(this.readAgents());
  }

  public refreshFromBackend(): void {
    this.http.get<Array<{ userId: number; fullName: string; email: string; phoneNumber: string; vehicleType?: string; vehicleNumber?: string; vehicleModel?: string; licenseNumber?: string; serviceArea?: string; active: boolean }>>(`${this.baseUrl}/delivery-agents`).subscribe({
      next: (agents) => {
        const mapped = agents.map((agent) => {
          return {
            id: agent.userId,
            name: agent.fullName,
            email: agent.email,
            phone: agent.phoneNumber || 'N/A',
            zone: agent.serviceArea || 'General',
            rating: '4.8 - Registered Partner',
            role: agent.vehicleType ? `${agent.vehicleType} - ID #${agent.userId}` : `Delivery Agent - ID #DA-${agent.userId}`,
            initial: agent.fullName ? agent.fullName.charAt(0).toUpperCase() : 'D',
            available: agent.active,
            online: agent.active,
            location: { lat: 28.7041, lng: 77.1025, accuracy: 18 }
          };
        });

        this.agentsSignal.set(mapped);
        localStorage.setItem(DIRECTORY_KEY, JSON.stringify(mapped));
      },
    });
  }
}
