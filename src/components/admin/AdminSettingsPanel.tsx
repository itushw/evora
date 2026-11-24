import { useEffect, useState, type FormEvent } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import {
  DEFAULT_PLATFORM_SETTINGS,
  usePlatformSettings,
} from '../../context/PlatformSettingsContext.tsx';
import { savePlatformSettingsAsAdmin } from '../../lib/firestoreStore.ts';
import type { PlatformSettings } from '../../types/ticketing.ts';

interface AdminSettingsPanelProps {
  adminEmail: string;
  onStatusMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/;

export function AdminSettingsPanel({
  adminEmail,
  onStatusMessage,
  onErrorMessage,
}: AdminSettingsPanelProps) {
  const { settings } = usePlatformSettings();
  const [draft, setDraft] = useState<PlatformSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    onErrorMessage('');
    onStatusMessage('');

    const trimmedVpa = draft.defaultPayoutVpa.trim();
    if (trimmedVpa && !UPI_VPA_REGEX.test(trimmedVpa)) {
      onErrorMessage('Default Payout UPI VPA must be a valid UPI ID (e.g. browns@okaxis) or blank.');
      return;
    }

    setSaving(true);
    try {
      await savePlatformSettingsAsAdmin(draft, adminEmail);
      onStatusMessage('Saved live platform settings. Changes are active across the entire site.');
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to save platform settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    onErrorMessage('');
    onStatusMessage('');
    try {
      const saved = await savePlatformSettingsAsAdmin(DEFAULT_PLATFORM_SETTINGS, adminEmail);
      setDraft(saved);
      onStatusMessage('Reset platform settings to defaults.');
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Operational Switches */}
      <div className="border border-[#e2e2e2] glass-light rounded-2xl p-6 md:p-8 space-y-5">
        <div className="pb-4 border-b border-[#e2e2e2]">
          <h2 className="text-lg font-bold text-[#000000]">Platform Switches & Autonomy</h2>
          <p className="mt-1 text-xs text-[#5e5e5e]">
            Control live site behavior instantly without redeploying code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 rounded-xl border border-[#e2e2e2] bg-[#ffffff] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.autoApproveEvents}
              onChange={(e) => setDraft({ ...draft, autoApproveEvents: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[#000000]"
            />
            <div>
              <p className="text-sm font-semibold text-[#000000]">Auto-Approve New Events</p>
              <p className="mt-0.5 text-xs text-[#5e5e5e]">
                When off, every submission waits in the admin moderation queue. When on, events go live immediately.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-[#e2e2e2] bg-[#ffffff] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.allowEventSubmissions}
              onChange={(e) => setDraft({ ...draft, allowEventSubmissions: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[#000000]"
            />
            <div>
              <p className="text-sm font-semibold text-[#000000]">Allow Event Submissions (/host)</p>
              <p className="mt-0.5 text-xs text-[#5e5e5e]">
                Uncheck to temporarily pause new organizer submissions site-wide.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-[#e2e2e2] bg-[#ffffff] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.allowBookings}
              onChange={(e) => setDraft({ ...draft, allowBookings: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[#000000]"
            />
            <div>
              <p className="text-sm font-semibold text-[#000000]">Allow Ticket Checkout</p>
              <p className="mt-0.5 text-xs text-[#5e5e5e]">
                Uncheck to pause checkout across all events (maintenance mode).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-[#e2e2e2] bg-[#ffffff] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.showPricingPage}
              onChange={(e) => setDraft({ ...draft, showPricingPage: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[#000000]"
            />
            <div>
              <p className="text-sm font-semibold text-[#000000]">Show Pricing Links in Navigation</p>
              <p className="mt-0.5 text-xs text-[#5e5e5e]">
                Controls Pricing links in the top header, footer, and homepage organizer banner.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-[#e2e2e2] bg-[#ffffff] p-4 cursor-pointer md:col-span-2">
            <input
              type="checkbox"
              checked={draft.showSeedEvents}
              onChange={(e) => setDraft({ ...draft, showSeedEvents: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[#000000]"
            />
            <div>
              <p className="text-sm font-semibold text-[#000000]">Show Built-in Sample Events</p>
              <p className="mt-0.5 text-xs text-[#5e5e5e]">
                Turn off when you want the public directory to display only live Firestore events created or approved by admins.
              </p>
            </div>
          </label>
        </div>

        {!draft.allowBookings ? (
          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Bookings Paused Message
            </label>
            <input
              type="text"
              value={draft.bookingsPausedMessage}
              onChange={(e) => setDraft({ ...draft, bookingsPausedMessage: e.target.value })}
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
        ) : null}
      </div>

      {/* Payments & Fees */}
      <div className="border border-[#e2e2e2] glass-light rounded-2xl p-6 md:p-8 space-y-5">
        <div className="pb-4 border-b border-[#e2e2e2]">
          <h2 className="text-lg font-bold text-[#000000]">Payments, Commission & Fallback UPI</h2>
          <p className="mt-1 text-xs text-[#5e5e5e]">
            Default commission is 0%. Fallback UPI VPA is used only when an event organizer does not specify their own UPI VPA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Platform Commission (%)
            </label>
            <input
              type="number"
              min={0}
              max={20}
              step="0.5"
              value={draft.platformFeePercent}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  platformFeePercent: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                })
              }
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Fallback Payout UPI VPA (optional)
            </label>
            <input
              type="text"
              value={draft.defaultPayoutVpa}
              onChange={(e) => setDraft({ ...draft, defaultPayoutVpa: e.target.value })}
              placeholder="Leave blank to use server env"
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Fallback Payee Name
            </label>
            <input
              type="text"
              value={draft.defaultPayeeName}
              onChange={(e) => setDraft({ ...draft, defaultPayeeName: e.target.value })}
              placeholder="Evora by Browns' Squad"
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
        </div>
      </div>

      {/* Site-Wide Announcement Banner */}
      <div className="border border-[#e2e2e2] glass-light rounded-2xl p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e2e2e2]">
          <div>
            <h2 className="text-lg font-bold text-[#000000]">Site-Wide Announcement Banner</h2>
            <p className="mt-1 text-xs text-[#5e5e5e]">
              Display an instant announcement across the homepage hero and all inner pages.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#000000] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.announcementEnabled}
              onChange={(e) => setDraft({ ...draft, announcementEnabled: e.target.checked })}
              className="h-4 w-4 accent-[#000000]"
            />
            <span>Enable Banner</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-[#000000] mb-1.5">Banner Text</label>
            <input
              type="text"
              value={draft.announcementText}
              onChange={(e) => setDraft({ ...draft, announcementText: e.target.value })}
              placeholder="Registrations for Winter Fest 2026 are now open."
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Link Label (optional)
            </label>
            <input
              type="text"
              value={draft.announcementLinkLabel}
              onChange={(e) => setDraft({ ...draft, announcementLinkLabel: e.target.value })}
              placeholder="Explore Events"
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Link Path or URL
            </label>
            <input
              type="text"
              value={draft.announcementLinkUrl}
              onChange={(e) => setDraft({ ...draft, announcementLinkUrl: e.target.value })}
              placeholder="/events"
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
            />
          </div>
        </div>
      </div>

      {/* Homepage & Contact Copy */}
      <div className="border border-[#e2e2e2] glass-light rounded-2xl p-6 md:p-8 space-y-5">
        <div className="pb-4 border-b border-[#e2e2e2]">
          <h2 className="text-lg font-bold text-[#000000]">Homepage Copy & Contact</h2>
          <p className="mt-1 text-xs text-[#5e5e5e]">
            Update main headlines and subcopy live without touching source code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">Hero Headline</label>
            <input
              type="text"
              required
              value={draft.heroHeadline}
              onChange={(e) => setDraft({ ...draft, heroHeadline: e.target.value })}
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">Support Email</label>
            <input
              type="email"
              value={draft.supportEmail}
              onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })}
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Hero Subheadline
            </label>
            <textarea
              rows={2}
              value={draft.heroSubheadline}
              onChange={(e) => setDraft({ ...draft, heroSubheadline: e.target.value })}
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Organizer Banner Headline
            </label>
            <input
              type="text"
              value={draft.ctaHeadline}
              onChange={(e) => setDraft({ ...draft, ctaHeadline: e.target.value })}
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#000000] mb-1.5">
              Organizer Banner Subheadline
            </label>
            <input
              type="text"
              value={draft.ctaSubheadline}
              onChange={(e) => setDraft({ ...draft, ctaSubheadline: e.target.value })}
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            void handleReset();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-5 py-3 text-xs font-medium text-[#000000]"
        >
          <RotateCcw size={13} aria-hidden="true" />
          <span>Reset to Defaults</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-6 py-3 text-sm font-medium text-[#ffffff]"
        >
          <Save size={14} aria-hidden="true" />
          <span>{saving ? 'Saving...' : 'Save Site Settings'}</span>
        </button>
      </div>
    </form>
  );
}
