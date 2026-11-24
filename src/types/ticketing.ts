export interface TicketTier {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  currency: 'INR';
  capacity: number;
  remaining: number;
}

export interface EventScheduleItem {
  time: string;
  title: string;
  speaker: string;
}

export interface EventHost {
  name: string;
  organization: string;
  role: string;
  contactEmail: string;
}

export const EVENT_CATEGORIES = [
  'Tech',
  'Music',
  'Arts',
  'College Fests',
  'Workshops',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type EventApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface EvoraEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: EventCategory;
  city: string;
  venueName: string;
  venueAddress: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  dateLabel: string;
  isoDate: string;
  timeLabel: string;
  timezone: string;
  coverImage: string;
  coverCaption: string;
  description: string[];
  host: EventHost;
  schedule: EventScheduleItem[];
  tiers: TicketTier[];
  featured?: boolean;
  refundPolicySummary: string;
  payoutVpa?: string;
  approvalStatus?: EventApprovalStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  creatorUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentIntentResponse {
  intentId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  tierId: string;
  tierName: string;
  quantity: number;
  currency: 'INR';
  subtotalPaise: number;
  platformFeePaise: number;
  totalPaise: number;
  expiresAt: string;
  paymentQrPayload: string | null;
  intentToken?: string;
}

export interface IssuedTicketPass {
  ticketId: string;
  seatCode: string;
  holderName: string;
  holderEmail: string;
  qrPayload: string;
  signature: string;
  checkedIn: boolean;
}

export interface TicketOrder {
  orderId: string;
  intentId: string;
  userId?: string;
  status: 'confirmed' | 'refunded';
  createdAt: string;
  refundedAt?: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDateLabel: string;
  eventTimeLabel: string;
  venueName: string;
  venueAddress: string;
  city: string;
  tierId: string;
  tierName: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  paymentReference: string;
  currency: 'INR';
  subtotalPaise: number;
  platformFeePaise: number;
  totalPaise: number;
  passes: IssuedTicketPass[];
}

export interface CreateEventPayload {
  title: string;
  subtitle: string;
  category: EventCategory;
  city: string;
  venueName: string;
  venueAddress: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  dateLabel: string;
  isoDate: string;
  timeLabel: string;
  timezone: string;
  coverImage: string;
  description: string;
  hostName: string;
  hostOrganization: string;
  hostEmail: string;
  payoutVpa?: string;
  refundPolicySummary: string;
  tiers: Array<{
    name: string;
    description: string;
    priceRupees: number;
    capacity: number;
  }>;
}

export interface PlatformSettings {
  heroHeadline: string;
  heroSubheadline: string;
  ctaHeadline: string;
  ctaSubheadline: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementLinkLabel: string;
  announcementLinkUrl: string;
  showPricingPage: boolean;
  showSeedEvents: boolean;
  autoApproveEvents: boolean;
  allowEventSubmissions: boolean;
  allowBookings: boolean;
  bookingsPausedMessage: string;
  platformFeePercent: number;
  defaultPayoutVpa: string;
  defaultPayeeName: string;
  supportEmail: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  provider: 'password' | 'google';
  createdAt: string;
  updatedAt: string;
}

export interface AdminRecord {
  uid: string;
  email: string;
  grantedAt: string;
}

