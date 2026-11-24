import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import type { PlatformSettings } from '../types/ticketing.ts';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  heroHeadline: 'Find your next event on campus and around the city.',
  heroSubheadline:
    'Browse upcoming college fests, hackathons, arts showcases, workshops, and live nights. Book your spot and get your pass right away.',
  ctaHeadline: 'Organizing a college fest or hackathon?',
  ctaSubheadline:
    'List your event, set ticket tiers or free RSVPs, and manage registrations in minutes.',
  announcementEnabled: false,
  announcementText: '',
  announcementLinkLabel: '',
  announcementLinkUrl: '',
  showPricingPage: true,
  showSeedEvents: true,
  autoApproveEvents: false,
  allowEventSubmissions: true,
  allowBookings: true,
  bookingsPausedMessage:
    'Ticket bookings are temporarily paused by the site administrator. Please check back shortly.',
  platformFeePercent: 0,
  defaultPayoutVpa: '',
  defaultPayeeName: "Evora by Browns' Squad",
  supportEmail: 'legal@browns.co.in',
};

interface PlatformSettingsContextValue {
  settings: PlatformSettings;
  settingsLoaded: boolean;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue>({
  settings: DEFAULT_PLATFORM_SETTINGS,
  settingsLoaded: false,
});

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const ref = doc(db, 'settings', 'platform');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PlatformSettings>;
          setSettings({
            ...DEFAULT_PLATFORM_SETTINGS,
            ...data,
            platformFeePercent:
              typeof data.platformFeePercent === 'number' &&
              Number.isFinite(data.platformFeePercent)
                ? Math.max(0, Math.min(20, data.platformFeePercent))
                : DEFAULT_PLATFORM_SETTINGS.platformFeePercent,
          });
        } else {
          setSettings(DEFAULT_PLATFORM_SETTINGS);
        }
        setSettingsLoaded(true);
      },
      () => {
        setSettings(DEFAULT_PLATFORM_SETTINGS);
        setSettingsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ settings, settingsLoaded }),
    [settings, settingsLoaded],
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings(): PlatformSettingsContextValue {
  return useContext(PlatformSettingsContext);
}
