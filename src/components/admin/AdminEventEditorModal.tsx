import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { AVAILABLE_COVERS } from '../../data/seedEvents.ts';
import { processCoverPhotoFile } from '../../lib/imageUpload.ts';
import {
  EVENT_CATEGORIES,
  type EventApprovalStatus,
  type EventCategory,
  type EventScheduleItem,
  type EvoraEvent,
  type TicketTier,
} from '../../types/ticketing.ts';

interface AdminEventEditorModalProps {
  initialEvent: EvoraEvent | null; // null = create brand-new event directly
  onClose: () => void;
  onSave: (event: EvoraEvent) => Promise<void>;
}

const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/;

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || `event-${Date.now()}`;
}

function formatDateLabel(isoDate: string, fallback: string): string {
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return fallback || isoDate;
  return parsed.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminEventEditorModal({
  initialEvent,
  onClose,
  onSave,
}: AdminEventEditorModalProps) {
  const isNew = !initialEvent;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [slug, setSlug] = useState(initialEvent?.slug || '');
  const [subtitle, setSubtitle] = useState(initialEvent?.subtitle || '');
  const [category, setCategory] = useState<EventCategory>(initialEvent?.category || 'Tech');
  const [city, setCity] = useState(initialEvent?.city || '');
  const [venueName, setVenueName] = useState(initialEvent?.venueName || '');
  const [venueAddress, setVenueAddress] = useState(initialEvent?.venueAddress || '');
  const [isoDate, setIsoDate] = useState(initialEvent?.isoDate || '2026-12-26');
  const [dateLabel, setDateLabel] = useState(initialEvent?.dateLabel || '');
  const [timeLabel, setTimeLabel] = useState(initialEvent?.timeLabel || '10:00 to 18:00');
  const [timezone, setTimezone] = useState(initialEvent?.timezone || 'IST');
  const [coverImage, setCoverImage] = useState(
    initialEvent?.coverImage || AVAILABLE_COVERS[0].url,
  );
  const [coverCaption, setCoverCaption] = useState(initialEvent?.coverCaption || '');
  const [descriptionText, setDescriptionText] = useState(
    initialEvent?.description.join('\n\n') || '',
  );
  const [approvalStatus, setApprovalStatus] = useState<EventApprovalStatus>(
    initialEvent?.approvalStatus || 'approved',
  );
  const [featured, setFeatured] = useState(Boolean(initialEvent?.featured));
  const [reviewNote, setReviewNote] = useState(initialEvent?.reviewNote || '');

  const [hostName, setHostName] = useState(initialEvent?.host.name || '');
  const [hostOrg, setHostOrg] = useState(initialEvent?.host.organization || '');
  const [hostRole, setHostRole] = useState(initialEvent?.host.role || 'Organizer');
  const [hostEmail, setHostEmail] = useState(initialEvent?.host.contactEmail || '');
  const [payoutVpa, setPayoutVpa] = useState(initialEvent?.payoutVpa || '');
  const [refundPolicy, setRefundPolicy] = useState(
    initialEvent?.refundPolicySummary ||
      'Full refund available up to 48 hours before doors open.',
  );

  const [schedule, setSchedule] = useState<EventScheduleItem[]>(
    initialEvent?.schedule.length
      ? initialEvent.schedule.map((s) => ({ ...s }))
      : [{ time: '09:30', title: 'Check-In & Pass Scan', speaker: 'Main Gate' }],
  );

  const [tiers, setTiers] = useState<TicketTier[]>(
    initialEvent?.tiers.length
      ? initialEvent.tiers.map((t) => ({ ...t }))
      : [
          {
            id: `tier_${Date.now()}_1`,
            name: 'General Pass',
            description: 'Standard event admission.',
            pricePaise: 0,
            currency: 'INR',
            capacity: 200,
            remaining: 200,
          },
        ],
  );

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setErrorText('');
    try {
      const processed = await processCoverPhotoFile(file);
      setCoverImage(processed.dataUrl);
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Unable to process image.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText('');

    const trimmedVpa = payoutVpa.trim();
    if (trimmedVpa && !UPI_VPA_REGEX.test(trimmedVpa)) {
      setErrorText('Enter a valid UPI VPA (e.g. club@okaxis) or leave it blank.');
      return;
    }

    if (tiers.length === 0) {
      setErrorText('Add at least one ticket tier.');
      return;
    }

    const finalSlug = (slug.trim() || slugify(title)).slice(0, 120);
    const finalId =
      initialEvent?.id || `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    const paragraphs = descriptionText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const cleanedSchedule = schedule
      .map((s) => ({
        time: s.time.trim() || 'TBA',
        title: s.title.trim() || 'Session',
        speaker: s.speaker.trim() || 'Host',
      }))
      .slice(0, 20);

    const cleanedTiers: TicketTier[] = tiers.slice(0, 10).map((t, idx) => {
      const cap = Math.max(1, Math.min(50000, Math.floor(Number(t.capacity) || 1)));
      const rem = Math.max(0, Math.min(cap, Math.floor(Number(t.remaining) || 0)));
      return {
        id: t.id || `tier_${finalSlug}_${idx + 1}`,
        name: t.name.trim() || `Tier ${idx + 1}`,
        description: t.description.trim() || 'Event entry pass.',
        pricePaise: Math.max(0, Math.round(Number(t.pricePaise) || 0)),
        currency: 'INR',
        capacity: cap,
        remaining: rem,
      };
    });

    const assembled: EvoraEvent = {
      id: finalId,
      slug: finalSlug,
      title: title.trim(),
      subtitle: subtitle.trim() || 'Campus event listed on Evora.',
      category,
      city: city.trim(),
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim() || `${venueName.trim()}, ${city.trim()}`,
      placeId: initialEvent?.placeId,
      latitude: initialEvent?.latitude,
      longitude: initialEvent?.longitude,
      isoDate: isoDate.trim(),
      dateLabel: dateLabel.trim() || formatDateLabel(isoDate.trim(), isoDate.trim()),
      timeLabel: timeLabel.trim() || '10:00 to 18:00',
      timezone: timezone.trim() || 'IST',
      coverImage: coverImage.trim() || AVAILABLE_COVERS[0].url,
      coverCaption: coverCaption.trim() || `${venueName.trim()}, ${city.trim()}.`,
      description: paragraphs.length > 0 ? paragraphs : [subtitle.trim() || title.trim()],
      host: {
        name: hostName.trim() || 'Evora Admin',
        organization: hostOrg.trim() || "Browns' Squad",
        role: hostRole.trim() || 'Organizer',
        contactEmail: hostEmail.trim() || 'legal@browns.co.in',
      },
      schedule:
        cleanedSchedule.length > 0
          ? cleanedSchedule
          : [{ time: 'Entry', title: 'Check-In & Pass Scan', speaker: 'Main Gate' }],
      tiers: cleanedTiers,
      featured,
      refundPolicySummary: refundPolicy.trim() || 'Refunds subject to organizer policy.',
      payoutVpa: trimmedVpa || undefined,
      approvalStatus,
      reviewNote: reviewNote.trim() || undefined,
      creatorUid: initialEvent?.creatorUid,
      createdAt: initialEvent?.createdAt,
    };

    setSaving(true);
    try {
      await onSave(assembled);
      onClose();
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Unable to save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Create event as admin' : `Edit ${initialEvent?.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="my-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#e2e2e2] bg-[#ffffff] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#e2e2e2]">
          <div>
            <p className="font-mono-tabular text-xs uppercase tracking-wide text-[#5e5e5e]">
              {isNew ? 'Direct Publish' : `Editing · ${initialEvent?.id}`}
            </p>
            <h2 className="mt-1 display-md text-[#000000]">
              {isNew ? 'Create Event (Full Admin Control)' : 'Edit Event'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e2e2] bg-[#f3f3f3] text-[#000000]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {errorText ? (
          <div
            role="alert"
            className="mt-5 border border-[#b42318] bg-[#ffffff] px-4 py-3 text-xs text-[#b42318] rounded-xl"
          >
            {errorText}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* Status & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl bg-[#f3f3f3] p-4 border border-[#e2e2e2]">
            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">
                Moderation Status
              </label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value as EventApprovalStatus)}
                className="w-full rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-3 py-2 text-xs text-[#000000]"
              >
                <option value="approved">Approved (Live)</option>
                <option value="pending">Pending (Hidden)</option>
                <option value="rejected">Rejected (Hidden)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">
                Review Note
              </label>
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Optional admin note"
                className="w-full rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-3 py-2 text-xs text-[#000000]"
              />
            </div>
            <label className="flex items-center gap-2.5 pt-5 text-xs font-medium text-[#000000] cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 accent-[#000000]"
              />
              <span>Mark as Featured Event</span>
            </label>
          </div>

          {/* Core Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#000000] mb-1">Event Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (isNew) setSlug(slugify(e.target.value));
                }}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">URL Slug</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-xs font-mono-tabular text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#000000] mb-1">Tagline</label>
              <input
                type="text"
                required
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">Venue Name</label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#000000] mb-1">Full Address</label>
              <input
                type="text"
                required
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">ISO Date</label>
              <input
                type="date"
                required
                value={isoDate}
                onChange={(e) => {
                  setIsoDate(e.target.value);
                  setDateLabel(formatDateLabel(e.target.value, e.target.value));
                }}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">Display Date Label</label>
              <input
                type="text"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                placeholder="Sat, 26 Dec 2026"
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">Time Window</label>
              <input
                type="text"
                required
                value={timeLabel}
                onChange={(e) => setTimeLabel(e.target.value)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#000000] mb-1">Timezone</label>
              <input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#000000] mb-1">
                Description (separate paragraphs with new lines)
              </label>
              <textarea
                rows={4}
                required
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="border-t border-[#e2e2e2] pt-6 space-y-4">
            <h3 className="text-sm font-bold text-[#000000]">Cover Photo</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4 overflow-hidden rounded-xl border border-[#e2e2e2] bg-[#efefef] aspect-[16/10]">
                <img
                  src={coverImage}
                  alt="Cover preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover block"
                />
              </div>
              <div className="md:col-span-8 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#000000] px-4 py-2 text-xs font-medium text-[#ffffff]"
                  >
                    <Upload size={13} aria-hidden="true" />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>
                  {AVAILABLE_COVERS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setCoverImage(preset.url)}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        coverImage === preset.url
                          ? 'border-[#000000] bg-[#efefef] font-medium'
                          : 'border-[#e2e2e2] bg-[#ffffff]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={coverCaption}
                  onChange={(e) => setCoverCaption(e.target.value)}
                  placeholder="Photo caption"
                  className="w-full rounded-lg bg-[#efefef] px-3 py-2 text-xs text-[#000000]"
                />
              </div>
            </div>
          </div>

          {/* Ticket Tiers */}
          <div className="border-t border-[#e2e2e2] pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#000000]">Ticket Tiers & Inventory</h3>
              <button
                type="button"
                onClick={() =>
                  setTiers((prev) => [
                    ...prev,
                    {
                      id: `tier_${Date.now()}_${prev.length + 1}`,
                      name: 'New Tier',
                      description: 'Event entry pass.',
                      pricePaise: 0,
                      currency: 'INR',
                      capacity: 100,
                      remaining: 100,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-full bg-[#efefef] px-3.5 py-1.5 text-xs font-medium text-[#000000]"
              >
                <Plus size={12} aria-hidden="true" />
                <span>Add Tier</span>
              </button>
            </div>
            <div className="space-y-3">
              {tiers.map((tier, idx) => (
                <div
                  key={tier.id}
                  className="rounded-xl border border-[#e2e2e2] bg-[#f3f3f3] p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#5e5e5e] mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={tier.name}
                        onChange={(e) =>
                          setTiers((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, name: e.target.value } : t)),
                          )
                        }
                        className="w-full rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-2.5 py-2 text-xs text-[#000000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5e5e5e] mb-1">Price (INR)</label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={Math.round(tier.pricePaise / 100)}
                        onChange={(e) => {
                          const paise = Math.max(0, Math.round((Number(e.target.value) || 0) * 100));
                          setTiers((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, pricePaise: paise } : t)),
                          );
                        }}
                        className="w-full rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-2.5 py-2 text-xs font-mono-tabular text-[#000000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5e5e5e] mb-1">Capacity</label>
                      <input
                        type="number"
                        min={1}
                        value={tier.capacity}
                        onChange={(e) => {
                          const cap = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                          setTiers((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, capacity: cap } : t)),
                          );
                        }}
                        className="w-full rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-2.5 py-2 text-xs font-mono-tabular text-[#000000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5e5e5e] mb-1">Remaining</label>
                      <input
                        type="number"
                        min={0}
                        value={tier.remaining}
                        onChange={(e) => {
                          const rem = Math.max(0, Number.parseInt(e.target.value, 10) || 0);
                          setTiers((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, remaining: rem } : t)),
                          );
                        }}
                        className="w-full rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-2.5 py-2 text-xs font-mono-tabular text-[#000000]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={tier.description}
                      onChange={(e) =>
                        setTiers((prev) =>
                          prev.map((t, i) =>
                            i === idx ? { ...t, description: e.target.value } : t,
                          ),
                        )
                      }
                      placeholder="What is included"
                      className="flex-1 rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-2.5 py-2 text-xs text-[#000000]"
                    />
                    {tiers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setTiers((prev) => prev.filter((_, i) => i !== idx))}
                        className="inline-flex items-center gap-1 text-xs text-[#b42318]"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="border-t border-[#e2e2e2] pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#000000]">Schedule</h3>
              <button
                type="button"
                onClick={() =>
                  setSchedule((prev) => [...prev, { time: '12:00', title: 'Session', speaker: 'Host' }])
                }
                className="inline-flex items-center gap-1 rounded-full bg-[#efefef] px-3.5 py-1.5 text-xs font-medium text-[#000000]"
              >
                <Plus size={12} aria-hidden="true" />
                <span>Add Slot</span>
              </button>
            </div>
            <div className="space-y-2.5">
              {schedule.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={item.time}
                    onChange={(e) =>
                      setSchedule((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, time: e.target.value } : s)),
                      )
                    }
                    placeholder="Time"
                    className="sm:col-span-3 rounded-lg bg-[#efefef] px-3 py-2 text-xs font-mono-tabular text-[#000000]"
                  />
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      setSchedule((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)),
                      )
                    }
                    placeholder="Title"
                    className="sm:col-span-5 rounded-lg bg-[#efefef] px-3 py-2 text-xs text-[#000000]"
                  />
                  <input
                    type="text"
                    value={item.speaker}
                    onChange={(e) =>
                      setSchedule((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, speaker: e.target.value } : s)),
                      )
                    }
                    placeholder="Speaker / Stage"
                    className="sm:col-span-3 rounded-lg bg-[#efefef] px-3 py-2 text-xs text-[#000000]"
                  />
                  <div className="sm:col-span-1 flex justify-end">
                    {schedule.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setSchedule((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="Remove schedule slot"
                        className="text-[#b42318]"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Organizer & Payouts */}
          <div className="border-t border-[#e2e2e2] pt-6 space-y-4">
            <h3 className="text-sm font-bold text-[#000000]">Organizer & Payout Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#000000] mb-1">Host Name</label>
                <input
                  type="text"
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#000000] mb-1">Organization</label>
                <input
                  type="text"
                  required
                  value={hostOrg}
                  onChange={(e) => setHostOrg(e.target.value)}
                  className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#000000] mb-1">Role</label>
                <input
                  type="text"
                  value={hostRole}
                  onChange={(e) => setHostRole(e.target.value)}
                  className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#000000] mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#000000] mb-1">
                  Organizer Payout UPI VPA (optional)
                </label>
                <input
                  type="text"
                  value={payoutVpa}
                  onChange={(e) => setPayoutVpa(e.target.value)}
                  placeholder="yourclub@okaxis"
                  className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm font-mono-tabular text-[#000000]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#000000] mb-1">Refund Policy</label>
                <input
                  type="text"
                  required
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  className="w-full rounded-lg bg-[#efefef] px-3.5 py-2.5 text-sm text-[#000000]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-5 border-t border-[#e2e2e2]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-5 py-2.5 text-xs font-medium text-[#000000]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-6 py-2.5 text-xs font-medium text-[#ffffff]"
            >
              {saving ? 'Saving...' : isNew ? 'Publish Event Now' : 'Save All Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
