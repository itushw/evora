import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { SEED_EVENTS } from '../data/seedEvents.ts';
import type { EvoraEvent, TicketOrder } from '../types/ticketing.ts';

export async function upsertUserProfile(
  user: User,
  provider: 'password' | 'google',
  overrideName?: string,
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const now = new Date().toISOString();
  const displayName = (overrideName || user.displayName || user.email?.split('@')[0] || 'Evora User')
    .trim()
    .slice(0, 100);
  const email = (user.email || '').trim().toLowerCase().slice(0, 160);
  if (!email) return;

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        provider,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await updateDoc(ref, {
        displayName,
        provider,
        updatedAt: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listMergedEvents(params?: {
  q?: string;
  category?: string;
  city?: string;
  sort?: string;
}): Promise<EvoraEvent[]> {
  let remoteEvents: EvoraEvent[] = [];
  try {
    const snap = await getDocs(collection(db, 'events'));
    remoteEvents = snap.docs.map((d) => d.data() as EvoraEvent);
  } catch (error) {
    // Public read fallback to seed events only if transient network issue occurs
    console.error('Firestore events read error:', error);
  }

  const bySlug = new Map<string, EvoraEvent>();
  SEED_EVENTS.forEach((evt) => {
    bySlug.set(evt.slug, {
      ...evt,
      tiers: evt.tiers.map((t) => ({ ...t })),
    });
  });
  remoteEvents.forEach((evt) => {
    if (evt && evt.slug) {
      bySlug.set(evt.slug, evt);
    }
  });

  let results = Array.from(bySlug.values());

  const q = params?.q?.trim().toLowerCase() || '';
  const category = params?.category?.trim() || '';
  const city = params?.city?.trim() || '';
  const sort = params?.sort?.trim() || 'date';

  if (q) {
    results = results.filter(
      (evt) =>
        evt.title.toLowerCase().includes(q) ||
        evt.subtitle.toLowerCase().includes(q) ||
        evt.city.toLowerCase().includes(q) ||
        evt.venueName.toLowerCase().includes(q) ||
        evt.host.organization.toLowerCase().includes(q),
    );
  }

  if (category && category !== 'All') {
    results = results.filter((evt) => evt.category === category);
  }

  if (city && city !== 'All') {
    results = results.filter((evt) => evt.city.toLowerCase() === city.toLowerCase());
  }

  if (sort === 'price_asc') {
    results.sort((a, b) => {
      const minA = Math.min(...a.tiers.map((t) => t.pricePaise));
      const minB = Math.min(...b.tiers.map((t) => t.pricePaise));
      return minA - minB;
    });
  } else if (sort === 'price_desc') {
    results.sort((a, b) => {
      const minA = Math.min(...a.tiers.map((t) => t.pricePaise));
      const minB = Math.min(...b.tiers.map((t) => t.pricePaise));
      return minB - minA;
    });
  } else {
    results.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  }

  return results;
}

export async function getMergedEventBySlug(slug: string): Promise<EvoraEvent | null> {
  try {
    const q = query(collection(db, 'events'), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as EvoraEvent;
    }
  } catch (error) {
    console.error('Firestore single event read error:', error);
  }

  const seed = SEED_EVENTS.find((e) => e.slug === slug);
  return seed ? { ...seed, tiers: seed.tiers.map((t) => ({ ...t })) } : null;
}

export async function persistHostedEvent(
  event: EvoraEvent,
  creatorUid: string,
): Promise<EvoraEvent> {
  const now = new Date().toISOString();
  const path = `events/${event.id}`;

  const docPayload: Record<string, unknown> = {
    id: event.id,
    slug: event.slug,
    title: event.title.slice(0, 160),
    subtitle: event.subtitle.slice(0, 320),
    category: event.category,
    city: event.city.slice(0, 80),
    venueName: event.venueName.slice(0, 160),
    venueAddress: event.venueAddress.slice(0, 300),
    dateLabel: event.dateLabel.slice(0, 60),
    isoDate: event.isoDate.slice(0, 20),
    timeLabel: event.timeLabel.slice(0, 60),
    timezone: event.timezone.slice(0, 20),
    coverImage:
      event.coverImage &&
      event.coverImage.length <= 260_000 &&
      (event.coverImage.startsWith('/src/assets/') ||
        event.coverImage.startsWith('https://') ||
        event.coverImage.startsWith('data:image/jpeg;base64,') ||
        event.coverImage.startsWith('data:image/png;base64,') ||
        event.coverImage.startsWith('data:image/webp;base64,'))
        ? event.coverImage
        : '/src/assets/images/real_hackathon_main.jpg',
    coverCaption: event.coverCaption.slice(0, 220),
    description: event.description.slice(0, 12),
    host: {
      name: event.host.name.slice(0, 100),
      organization: event.host.organization.slice(0, 120),
      role: event.host.role.slice(0, 80),
      contactEmail: event.host.contactEmail.slice(0, 160),
    },
    schedule: event.schedule.slice(0, 20),
    tiers: event.tiers.slice(0, 10),
    refundPolicySummary: event.refundPolicySummary.slice(0, 300),
    creatorUid,
    createdAt: now,
    updatedAt: now,
  };

  if (event.placeId) {
    docPayload.placeId = event.placeId.slice(0, 200);
  }
  if (typeof event.latitude === 'number' && Number.isFinite(event.latitude)) {
    docPayload.latitude = event.latitude;
  }
  if (typeof event.longitude === 'number' && Number.isFinite(event.longitude)) {
    docPayload.longitude = event.longitude;
  }
  if (typeof event.featured === 'boolean') {
    docPayload.featured = event.featured;
  }

  try {
    await setDoc(doc(db, 'events', event.id), docPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    ...event,
    creatorUid,
    createdAt: now,
    updatedAt: now,
  };
}

export async function persistConfirmedOrder(
  order: TicketOrder,
  userId: string,
): Promise<TicketOrder> {
  const path = `orders/${order.orderId}`;
  const orderDoc = {
    orderId: order.orderId,
    intentId: order.intentId,
    userId,
    status: 'confirmed' as const,
    createdAt: order.createdAt,
    eventId: order.eventId,
    eventSlug: order.eventSlug,
    eventTitle: order.eventTitle.slice(0, 160),
    eventDateLabel: order.eventDateLabel.slice(0, 60),
    eventTimeLabel: order.eventTimeLabel.slice(0, 60),
    venueName: order.venueName.slice(0, 160),
    venueAddress: order.venueAddress.slice(0, 300),
    city: order.city.slice(0, 80),
    tierId: order.tierId,
    tierName: order.tierName.slice(0, 100),
    quantity: order.quantity,
    buyerName: order.buyerName.slice(0, 100),
    buyerEmail: order.buyerEmail.slice(0, 160),
    buyerPhone: (order.buyerPhone || '').slice(0, 30),
    paymentReference: order.paymentReference.slice(0, 60),
    currency: 'INR' as const,
    subtotalPaise: order.subtotalPaise,
    platformFeePaise: order.platformFeePaise,
    totalPaise: order.totalPaise,
    passes: order.passes,
  };

  try {
    await setDoc(doc(db, 'orders', order.orderId), orderDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Also decrement remaining count if this event document exists in Firestore
  try {
    const eventRef = doc(db, 'events', order.eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const data = eventSnap.data() as EvoraEvent;
      const updatedTiers = data.tiers.map((tier) =>
        tier.id === order.tierId
          ? { ...tier, remaining: Math.max(0, tier.remaining - order.quantity) }
          : tier,
      );
      await updateDoc(eventRef, {
        tiers: updatedTiers,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {
    // Non-blocking inventory mirror for seeded events not yet written to Firestore
  }

  return orderDoc;
}

export async function listUserOrders(userId: string): Promise<TicketOrder[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as TicketOrder)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getUserOrderById(orderId: string): Promise<TicketOrder | null> {
  const normalized = orderId.trim().toUpperCase();
  const path = `orders/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'orders', normalized));
    return snap.exists() ? (snap.data() as TicketOrder) : null;
  } catch (error) {
    // If permission denied (not owner) or missing, return null gracefully unless unexpected
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function cancelUserOrderInFirestore(order: TicketOrder): Promise<TicketOrder> {
  const path = `orders/${order.orderId}`;
  const refundedAt = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'orders', order.orderId), {
      status: 'refunded',
      refundedAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  // Restore inventory if event exists in Firestore
  try {
    const eventRef = doc(db, 'events', order.eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const data = eventSnap.data() as EvoraEvent;
      const updatedTiers = data.tiers.map((tier) =>
        tier.id === order.tierId
          ? { ...tier, remaining: Math.min(tier.capacity, tier.remaining + order.quantity) }
          : tier,
      );
      await updateDoc(eventRef, {
        tiers: updatedTiers,
        updatedAt: refundedAt,
      });
    }
  } catch {
    // Non-blocking
  }

  return {
    ...order,
    status: 'refunded',
    refundedAt,
  };
}
