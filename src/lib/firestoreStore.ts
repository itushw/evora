import {
  collection,
  deleteDoc,
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
import type {
  AdminRecord,
  EventApprovalStatus,
  EvoraEvent,
  PlatformSettings,
  TicketOrder,
  UserProfileRecord,
} from '../types/ticketing.ts';

export const ADMIN_EMAIL = 'brownsquad67@gmail.com';

export async function isGoogleSsoSession(user: User | null): Promise<boolean> {
  if (!user) return false;
  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.signInProvider === 'google.com';
  } catch {
    return false;
  }
}

export async function checkIsAdminUser(user: User | null): Promise<boolean> {
  if (!user) return false;
  const googleSso = await isGoogleSsoSession(user);
  if (!googleSso) return false;

  if (user.email?.toLowerCase() === ADMIN_EMAIL && user.emailVerified) {
    return true;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

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
  includeSeedEvents?: boolean;
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
  if (params?.includeSeedEvents !== false) {
    SEED_EVENTS.forEach((evt) => {
      bySlug.set(evt.slug, {
        ...evt,
        tiers: evt.tiers.map((t) => ({ ...t })),
      });
    });
  }
  remoteEvents.forEach((evt) => {
    if (!evt || !evt.slug) return;
    if (evt.approvalStatus === 'pending' || evt.approvalStatus === 'rejected') {
      bySlug.delete(evt.slug);
      return;
    }
    bySlug.set(evt.slug, evt);
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
  initialStatus: EventApprovalStatus = 'pending',
): Promise<EvoraEvent> {
  const now = new Date().toISOString();
  const path = `events/${event.id}`;

  const docPayload = buildSanitizedEventDoc(event, creatorUid, initialStatus, now, now);

  try {
    await setDoc(doc(db, 'events', event.id), docPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    ...event,
    payoutVpa: event.payoutVpa?.trim() || undefined,
    approvalStatus: initialStatus,
    creatorUid,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSanitizedEventDoc(
  event: EvoraEvent,
  creatorUid: string,
  approvalStatus: EventApprovalStatus,
  createdAt: string,
  updatedAt: string,
): Record<string, unknown> {
  const docPayload: Record<string, unknown> = {
    id: event.id,
    slug: event.slug.slice(0, 120),
    title: event.title.trim().slice(0, 160),
    subtitle: event.subtitle.trim().slice(0, 320),
    category: event.category,
    city: event.city.trim().slice(0, 80),
    venueName: event.venueName.trim().slice(0, 160),
    venueAddress: event.venueAddress.trim().slice(0, 300),
    dateLabel: event.dateLabel.trim().slice(0, 60),
    isoDate: event.isoDate.trim().slice(0, 20),
    timeLabel: event.timeLabel.trim().slice(0, 60),
    timezone: event.timezone.trim().slice(0, 20),
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
    coverCaption: (event.coverCaption || `${event.venueName}, ${event.city}`).trim().slice(0, 220),
    description: (event.description.length > 0 ? event.description : [event.subtitle]).slice(0, 12),
    host: {
      name: event.host.name.trim().slice(0, 100),
      organization: event.host.organization.trim().slice(0, 120),
      role: (event.host.role || 'Organizer').trim().slice(0, 80),
      contactEmail: event.host.contactEmail.trim().slice(0, 160),
    },
    schedule:
      event.schedule.length > 0
        ? event.schedule.slice(0, 20)
        : [{ time: 'Entry', title: 'Check-In & Pass Scan', speaker: 'Main Gate' }],
    tiers: event.tiers.slice(0, 10),
    refundPolicySummary: event.refundPolicySummary.trim().slice(0, 300),
    approvalStatus,
    creatorUid,
    createdAt,
    updatedAt,
  };

  if (event.payoutVpa && event.payoutVpa.trim()) {
    docPayload.payoutVpa = event.payoutVpa.trim().slice(0, 100);
  }
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
  if (event.reviewNote && event.reviewNote.trim()) {
    docPayload.reviewNote = event.reviewNote.trim().slice(0, 300);
  }
  if (event.reviewedAt) {
    docPayload.reviewedAt = event.reviewedAt.slice(0, 40);
  }
  if (event.reviewedBy) {
    docPayload.reviewedBy = event.reviewedBy.slice(0, 160);
  }

  return docPayload;
}

export async function listAllEventsForAdmin(): Promise<
  Array<EvoraEvent & { source: 'firestore' | 'seed' }>
> {
  const path = 'events';
  try {
    const snap = await getDocs(collection(db, 'events'));
    const remoteById = new Map<string, EvoraEvent>();
    const remoteBySlug = new Map<string, EvoraEvent>();
    snap.docs.forEach((d) => {
      const evt = d.data() as EvoraEvent;
      if (evt?.id) remoteById.set(evt.id, evt);
      if (evt?.slug) remoteBySlug.set(evt.slug, evt);
    });

    const combined: Array<EvoraEvent & { source: 'firestore' | 'seed' }> = [];
    remoteById.forEach((evt) => {
      combined.push({ ...evt, source: 'firestore' });
    });

    SEED_EVENTS.forEach((seed) => {
      if (!remoteById.has(seed.id) && !remoteBySlug.has(seed.slug)) {
        combined.push({
          ...seed,
          tiers: seed.tiers.map((t) => ({ ...t })),
          approvalStatus: 'approved',
          source: 'seed',
        });
      }
    });

    return combined.sort((a, b) => (b.createdAt || b.isoDate).localeCompare(a.createdAt || a.isoDate));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveFullEventAsAdmin(
  event: EvoraEvent,
  adminUid: string,
  adminEmail: string,
): Promise<EvoraEvent> {
  const path = `events/${event.id}`;
  const now = new Date().toISOString();
  const createdAt = event.createdAt || now;
  const creatorUid = event.creatorUid || adminUid;
  const status: EventApprovalStatus = event.approvalStatus || 'approved';

  const payload = buildSanitizedEventDoc(
    {
      ...event,
      reviewedAt: now,
      reviewedBy: adminEmail.trim().slice(0, 160),
    },
    creatorUid,
    status,
    createdAt,
    now,
  );

  try {
    await setDoc(doc(db, 'events', event.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  return {
    ...event,
    approvalStatus: status,
    creatorUid,
    createdAt,
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: adminEmail,
  };
}

export async function updateEventApprovalStatus(
  eventId: string,
  status: EventApprovalStatus,
  adminEmail: string,
  reviewNote?: string,
  fallbackSeedEvent?: EvoraEvent,
  adminUid?: string,
): Promise<void> {
  const path = `events/${eventId}`;
  const now = new Date().toISOString();
  try {
    const ref = doc(db, 'events', eventId);
    const snap = await getDoc(ref);
    if (!snap.exists() && fallbackSeedEvent && adminUid) {
      await saveFullEventAsAdmin(
        {
          ...fallbackSeedEvent,
          approvalStatus: status,
          reviewNote: (reviewNote || '').trim().slice(0, 300),
        },
        adminUid,
        adminEmail,
      );
      return;
    }
    await updateDoc(ref, {
      approvalStatus: status,
      reviewedAt: now,
      reviewedBy: adminEmail.trim().slice(0, 160),
      reviewNote: (reviewNote || '').trim().slice(0, 300),
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventAsAdmin(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listAllOrdersForAdmin(): Promise<TicketOrder[]> {
  const path = 'orders';
  try {
    const snap = await getDocs(collection(db, 'orders'));
    return snap.docs
      .map((d) => d.data() as TicketOrder)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateOrderAsAdmin(
  order: TicketOrder,
  patch: Partial<Pick<TicketOrder, 'status' | 'refundedAt' | 'passes'>>,
): Promise<TicketOrder> {
  const path = `orders/${order.orderId}`;
  const nextOrder: TicketOrder = {
    ...order,
    ...patch,
  };
  const updatePayload: Record<string, unknown> = {
    status: nextOrder.status,
    passes: nextOrder.passes,
  };
  if (nextOrder.status === 'refunded') {
    updatePayload.refundedAt = nextOrder.refundedAt || new Date().toISOString();
    nextOrder.refundedAt = updatePayload.refundedAt as string;
  }

  try {
    await updateDoc(doc(db, 'orders', order.orderId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return nextOrder;
}

export async function deleteOrderAsAdmin(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listAllUsersForAdmin(): Promise<UserProfileRecord[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs
      .map((d) => d.data() as UserProfileRecord)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateUserNameAsAdmin(uid: string, displayName: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: displayName.trim().slice(0, 100),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserProfileAsAdmin(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listAdminRecords(): Promise<AdminRecord[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, 'admins'));
    return snap.docs
      .map((d) => d.data() as AdminRecord)
      .sort((a, b) => (b.grantedAt || '').localeCompare(a.grantedAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function grantAdminAccess(uid: string, email: string): Promise<AdminRecord> {
  const cleanedUid = uid.trim();
  const path = `admins/${cleanedUid}`;
  const record: AdminRecord = {
    uid: cleanedUid,
    email: email.trim().toLowerCase().slice(0, 160),
    grantedAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'admins', cleanedUid), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  return record;
}

export async function revokeAdminAccess(uid: string): Promise<void> {
  const path = `admins/${uid}`;
  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePlatformSettingsAsAdmin(
  settings: PlatformSettings,
  adminEmail: string,
): Promise<PlatformSettings> {
  const path = 'settings/platform';
  const now = new Date().toISOString();
  const sanitized: PlatformSettings = {
    heroHeadline: settings.heroHeadline.trim().slice(0, 180) || 'Find your next event on campus and around the city.',
    heroSubheadline: settings.heroSubheadline.trim().slice(0, 400),
    ctaHeadline: settings.ctaHeadline.trim().slice(0, 180),
    ctaSubheadline: settings.ctaSubheadline.trim().slice(0, 400),
    announcementEnabled: Boolean(settings.announcementEnabled),
    announcementText: settings.announcementText.trim().slice(0, 240),
    announcementLinkLabel: settings.announcementLinkLabel.trim().slice(0, 60),
    announcementLinkUrl: settings.announcementLinkUrl.trim().slice(0, 240),
    showPricingPage: Boolean(settings.showPricingPage),
    showSeedEvents: Boolean(settings.showSeedEvents),
    autoApproveEvents: Boolean(settings.autoApproveEvents),
    allowEventSubmissions: Boolean(settings.allowEventSubmissions),
    allowBookings: Boolean(settings.allowBookings),
    bookingsPausedMessage: settings.bookingsPausedMessage.trim().slice(0, 260),
    platformFeePercent: Math.max(0, Math.min(20, Number(settings.platformFeePercent) || 0)),
    defaultPayoutVpa: settings.defaultPayoutVpa.trim().slice(0, 100),
    defaultPayeeName: settings.defaultPayeeName.trim().slice(0, 80),
    supportEmail: settings.supportEmail.trim().slice(0, 160),
    updatedAt: now,
    updatedBy: adminEmail.trim().slice(0, 160),
  };

  try {
    await setDoc(doc(db, 'settings', 'platform'), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  return sanitized;
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
