import { Injectable, computed, inject, signal } from '@angular/core';

import { NotificationService } from './notification.service';
import { RealtimeSyncService } from './realtime-sync.service';

export type ReviewKind = 'CUSTOMER' | 'OWNER' | 'DELIVERY';
export type ReviewResponseRole = 'OWNER' | 'DELIVERY' | 'ADMIN';

interface ReviewResponse {
  byRole: ReviewResponseRole;
  text: string;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  kind: ReviewKind;
  orderId: string;
  restaurantId?: string;
  restaurantName: string;
  customerName: string;
  customerEmail?: string;
  deliveryAgentName?: string;
  restaurantRating?: number;
  deliveryAgentRating?: number;
  customerRating?: number;
  overallRating?: number;
  comment: string;
  images: string[];
  responses: ReviewResponse[];
  flagged: boolean;
  flagReason?: string;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

const REVIEWS_KEY = 'quickbite.reviews';
const BLOCKED_USERS_KEY = 'quickbite.blockedUsers';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly notifications = inject(NotificationService);
  private readonly sync = inject(RealtimeSyncService);
  private readonly reviewsSignal = signal<ReviewRecord[]>(this.readReviews());
  private readonly blockedUsersSignal = signal<string[]>(this.readBlockedUsers());

  constructor() {
    this.sync.on('reviews', () => {
      this.reviewsSignal.set(this.readReviews());
      this.blockedUsersSignal.set(this.readBlockedUsers());
    });
  }

  readonly reviews = computed(() => this.reviewsSignal());
  readonly blockedUsers = computed(() => this.blockedUsersSignal());

  submitCustomerReview(review: {
    orderId: string;
    restaurantId?: string;
    restaurantName: string;
    customerName: string;
    customerEmail?: string;
    deliveryAgentName?: string;
    restaurantRating: number;
    deliveryAgentRating: number;
    overallRating: number;
    comment: string;
    images?: string[];
  }): void {
    const next: ReviewRecord = {
      id: this.findCustomerReview(review.orderId)?.id ?? `REV-${Date.now()}`,
      kind: 'CUSTOMER',
      orderId: review.orderId,
      restaurantId: review.restaurantId,
      restaurantName: review.restaurantName,
      customerName: review.customerName,
      customerEmail: review.customerEmail,
      deliveryAgentName: review.deliveryAgentName,
      restaurantRating: review.restaurantRating,
      deliveryAgentRating: review.deliveryAgentRating,
      overallRating: review.overallRating,
      comment: review.comment,
      images: review.images ?? [],
      responses: this.findCustomerReview(review.orderId)?.responses ?? [],
      flagged: this.findCustomerReview(review.orderId)?.flagged ?? false,
      flagReason: this.findCustomerReview(review.orderId)?.flagReason,
      blocked: this.isBlocked(review.customerEmail ?? review.customerName),
      createdAt: this.findCustomerReview(review.orderId)?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.upsert(next);
  }

  submitRoleReview(review: {
    orderId: string;
    kind: Exclude<ReviewKind, 'CUSTOMER'>;
    restaurantId?: string;
    restaurantName: string;
    customerName: string;
    customerEmail?: string;
    deliveryAgentName?: string;
    restaurantRating?: number;
    deliveryAgentRating?: number;
    customerRating?: number;
    overallRating?: number;
    comment: string;
    images?: string[];
  }): void {
    const next: ReviewRecord = {
      id: `REV-${Date.now()}`,
      kind: review.kind,
      orderId: review.orderId,
      restaurantId: review.restaurantId,
      restaurantName: review.restaurantName,
      customerName: review.customerName,
      customerEmail: review.customerEmail,
      deliveryAgentName: review.deliveryAgentName,
      restaurantRating: review.restaurantRating,
      deliveryAgentRating: review.deliveryAgentRating,
      customerRating: review.customerRating,
      overallRating: review.overallRating,
      comment: review.comment,
      images: review.images ?? [],
      responses: [],
      flagged: false,
      blocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.reviewsSignal.update((items) => [next, ...items]);
    this.persist();
  }

  editReview(
    reviewId: string,
    patch: Partial<
      Pick<
        ReviewRecord,
        | 'restaurantRating'
        | 'deliveryAgentRating'
        | 'customerRating'
        | 'overallRating'
        | 'comment'
        | 'images'
      >
    >,
  ): boolean {
    const review = this.reviewsSignal().find((item) => item.id === reviewId);
    if (!review || !this.canEdit(review)) {
      return false;
    }

    this.reviewsSignal.update((items) =>
      items.map((item) =>
        item.id === reviewId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
      ),
    );
    this.persist();
    return true;
  }

  deleteReview(reviewId: string): void {
    this.reviewsSignal.update((items) => items.filter((item) => item.id !== reviewId));
    this.persist();
  }

  addResponse(reviewId: string, byRole: ReviewResponseRole, text: string): void {
    const review = this.reviewsSignal().find((item) => item.id === reviewId);
    this.reviewsSignal.update((items) =>
      items.map((item) =>
        item.id === reviewId
          ? {
              ...item,
              responses: [...item.responses, { byRole, text, createdAt: new Date().toISOString() }],
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    this.persist();

    if (review?.customerEmail) {
      const roleLabel =
        byRole === 'OWNER' ? 'restaurant' : byRole === 'DELIVERY' ? 'delivery partner' : 'team';
      this.notifications
        .create({
          recipientEmail: review.customerEmail,
          title: 'Reply to your review',
          message: `Your ${roleLabel} team replied to your review for ${review.restaurantName}.`,
          category: 'REVIEW',
        })
        .subscribe();
    }
  }

  flagReview(reviewId: string, reason: string): void {
    this.reviewsSignal.update((items) =>
      items.map((item) =>
        item.id === reviewId
          ? { ...item, flagged: true, flagReason: reason, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    this.persist();
  }

  blockUser(identifier: string): void {
    if (!identifier.trim()) {
      return;
    }

    this.blockedUsersSignal.update((items) =>
      Array.from(new Set([identifier.trim().toLowerCase(), ...items])),
    );
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(this.blockedUsersSignal()));
  }

  customerReviews(orderId?: string): ReviewRecord[] {
    return this.reviewsSignal().filter(
      (review) => review.kind === 'CUSTOMER' && (!orderId || review.orderId === orderId),
    );
  }

  restaurantReviews(restaurantName: string): ReviewRecord[] {
    return this.reviewsSignal().filter((review) => review.restaurantName === restaurantName);
  }

  deliveryAgentReviews(agentName: string): ReviewRecord[] {
    return this.reviewsSignal().filter((review) => review.deliveryAgentName === agentName);
  }

  flaggedReviews(): ReviewRecord[] {
    return this.reviewsSignal().filter((review) => review.flagged && !review.blocked);
  }

  averageRestaurantRating(restaurantName: string): number {
    const reviews = this.restaurantReviews(restaurantName).filter(
      (review) => typeof review.restaurantRating === 'number',
    );
    return this.average(reviews.map((review) => review.restaurantRating ?? 0));
  }

  averageDeliveryRating(agentName: string): number {
    const reviews = this.deliveryAgentReviews(agentName).filter(
      (review) => typeof review.deliveryAgentRating === 'number',
    );
    return this.average(reviews.map((review) => review.deliveryAgentRating ?? 0));
  }

  canEdit(review: ReviewRecord): boolean {
    return Date.now() - new Date(review.createdAt).getTime() <= 30 * 60 * 1000;
  }

  findCustomerReview(orderId: string): ReviewRecord | undefined {
    return this.reviewsSignal().find(
      (review) => review.kind === 'CUSTOMER' && review.orderId === orderId,
    );
  }

  isBlocked(identifier?: string): boolean {
    if (!identifier) {
      return false;
    }
    return this.blockedUsersSignal().includes(identifier.toLowerCase());
  }

  private upsert(review: ReviewRecord): void {
    this.reviewsSignal.update((items) => {
      const filtered = items.filter(
        (item) => !(item.kind === 'CUSTOMER' && item.orderId === review.orderId),
      );
      return [review, ...filtered];
    });
    this.persist();
  }

  private average(values: number[]): number {
    if (!values.length) {
      return 0;
    }
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }

  private persist(): void {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(this.reviewsSignal()));
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(this.blockedUsersSignal()));
    this.sync.publish('reviews');
  }

  private readReviews(): ReviewRecord[] {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as ReviewRecord[];
    } catch {
      return [];
    }
  }

  private readBlockedUsers(): string[] {
    const raw = localStorage.getItem(BLOCKED_USERS_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
}
