import { Injectable, computed, inject, signal } from '@angular/core';

import { RealtimeSyncService } from './realtime-sync.service';
import { SessionService } from './session.service';
import { DELIVERY_AGENT_SEEDS, DeliveryAgentDirectoryEntry } from './delivery-agents.data';

const DIRECTORY_KEY = 'quickbite.delivery.agents.directory';

@Injectable({ providedIn: 'root' })
export class DeliveryAgentDirectoryService {
  private readonly sync = inject(RealtimeSyncService);
  private readonly session = inject(SessionService);
  private readonly agentsSignal = signal<DeliveryAgentDirectoryEntry[]>(this.readAgents());

  readonly agents = computed(() => this.agentsSignal());
  readonly availableAgents = computed(() =>
    this.agentsSignal().filter((agent) => agent.available && agent.online),
  );

  constructor() {
    this.sync.on(DIRECTORY_KEY, () => this.refresh());
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
    const seed = DELIVERY_AGENT_SEEDS;
    if (!raw) {
      return seed;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<DeliveryAgentDirectoryEntry>[];
      return seed.map((agent) => {
        const match = parsed.find(
          (item) => item.email?.toLowerCase() === agent.email.toLowerCase(),
        );
        return match ? { ...agent, ...match } : agent;
      });
    } catch {
      return seed;
    }
  }

  private persist(): void {
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(this.agentsSignal()));
    this.sync.publish(DIRECTORY_KEY);
  }

  private refresh(): void {
    this.agentsSignal.set(this.readAgents());
  }
}
