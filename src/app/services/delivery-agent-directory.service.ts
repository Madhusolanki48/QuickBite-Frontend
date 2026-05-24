import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { RealtimeSyncService } from './realtime-sync.service';
import { SessionService } from './session.service';
import { DELIVERY_AGENT_SEEDS, DeliveryAgentDirectoryEntry } from './delivery-agents.data';

const DIRECTORY_KEY = 'quickbite.delivery.agents.directory';
const ALLOWED_AGENT_EMAILS = new Set(
  DELIVERY_AGENT_SEEDS.map((agent) => agent.email.toLowerCase()),
);

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
    const found = this.agentsSignal().find((agent) => agent.email.toLowerCase() === email);
    if (found) {
      return found;
    }
    const user = this.session.user();
    if (user?.role === 'DELIVERY_PARTNER' && user.email) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Delivery Partner';
      return {
        name,
        email: user.email,
        phone: user.phoneNumber || '+91 98765 43210',
        zone: 'Central Zone',
        rating: '4.9 - Active Partner',
        role: 'Delivery Partner',
        initial: name.charAt(0).toUpperCase(),
        online: true,
        available: true,
        location: { lat: 28.5355, lng: 77.241, accuracy: 15 },
      };
    }
    return null;
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
      return [...DELIVERY_AGENT_SEEDS];
    }

    try {
      const parsed = (JSON.parse(raw) as DeliveryAgentDirectoryEntry[])
        .filter((agent) => ALLOWED_AGENT_EMAILS.has(agent.email.toLowerCase()))
        .map((agent) => this.canonicalizeSeedAgent(agent));
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [...DELIVERY_AGENT_SEEDS];
      }
      const existingEmails = new Set(parsed.map((a) => a.email.toLowerCase()));
      const missingSeeds = DELIVERY_AGENT_SEEDS.filter(
        (seed) => !existingEmails.has(seed.email.toLowerCase()),
      );
      return [...parsed, ...missingSeeds];
    } catch {
      return [...DELIVERY_AGENT_SEEDS];
    }
  }

  private canonicalizeSeedAgent(agent: DeliveryAgentDirectoryEntry): DeliveryAgentDirectoryEntry {
    const seed = DELIVERY_AGENT_SEEDS.find(
      (item) => item.email.toLowerCase() === agent.email.toLowerCase(),
    );
    if (!seed) {
      return agent;
    }

    return {
      ...agent,
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      zone: seed.zone,
      rating: seed.rating,
      role: seed.role,
      initial: seed.initial,
      location: seed.location,
    };
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
        const mapped = agents
          .filter((agent) => ALLOWED_AGENT_EMAILS.has(agent.email.toLowerCase()))
          .map((agent) => {
            const seed = DELIVERY_AGENT_SEEDS.find(
              (item) => item.email.toLowerCase() === agent.email.toLowerCase(),
            );
            return {
              id: agent.userId,
              name: seed?.name ?? agent.fullName,
              email: agent.email,
              phone: seed?.phone ?? agent.phoneNumber ?? '+91 98765 43210',
              zone: seed?.zone ?? agent.serviceArea ?? 'General Zone',
              rating: seed?.rating ?? '4.8 - Registered Partner',
              role:
                seed?.role ??
                (agent.vehicleType
                  ? `${agent.vehicleType} - ID #${agent.userId}`
                  : `Delivery Agent - ID #DA-${agent.userId}`),
              initial:
                seed?.initial ?? (agent.fullName ? agent.fullName.charAt(0).toUpperCase() : 'D'),
              available: seed?.available ?? (agent.active !== false),
              online: seed?.online ?? (agent.active !== false),
              location: seed?.location ?? { lat: 28.5355, lng: 77.241, accuracy: 15 },
            };
          });

        const backendEmails = new Set(mapped.map((a) => a.email.toLowerCase()));
        const missingSeeds = DELIVERY_AGENT_SEEDS.filter(
          (seed) => !backendEmails.has(seed.email.toLowerCase()),
        );
        const allAgents = [...mapped, ...missingSeeds];

        this.agentsSignal.set(allAgents);
        localStorage.setItem(DIRECTORY_KEY, JSON.stringify(allAgents));
      },
      error: () => {
        if (this.agentsSignal().length === 0) {
          this.agentsSignal.set([...DELIVERY_AGENT_SEEDS]);
        }
      },
    });
  }
}
