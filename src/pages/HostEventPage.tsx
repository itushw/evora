import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Upload, X } from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { AuthCard } from '../components/AuthCard.tsx';
import {
  VenueAutocompleteInput,
  type SelectedVenuePlace,
} from '../components/VenueAutocompleteInput.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { AVAILABLE_COVERS } from '../data/seedEvents.ts';
import { createEvent } from '../lib/api.ts';
import { persistHostedEvent } from '../lib/firestoreStore.ts';
import { processCoverPhotoFile, type ProcessedCoverPhoto } from '../lib/imageUpload.ts';
import { EVENT_CATEGORIES, type EventCategory, type EvoraEvent } from '../types/ticketing.ts';

const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/;

interface DraftTier {
  name: string;
  description: string;
  priceRupees: string;
  capacity: string;
}

export function HostEventPage() {
  const { user, authReady } = useAuth();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Tech');
  const [city, setCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [verifiedVenueLabel, setVerifiedVenueLabel] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isoDate, setIsoDate] = useState('2026-12-26');
  const [timeLabel, setTimeLabel] = useState('09:30 to 18:30');
  const [timezone, setTimezone] = useState('IST');
  const [coverImage, setCoverImage] = useState(AVAILABLE_COVERS[0].url);
  const [customPhoto, setCustomPhoto] = useState<ProcessedCoverPhoto | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [description, setDescription] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostOrganization, setHostOrganization] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [payoutVpa, setPayoutVpa] = useState('');
  const [refundPolicySummary, setRefundPolicySummary] = useState(
    'Full refund available up to 48 hours before doors open.',
  );

  const [tiers, setTiers] = useState<DraftTier[]>([
    {
      name: 'General Pass',
      description: 'Standard event admission and campus access.',
      priceRupees: '299',
      capacity: '150',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [submittedEvent, setSubmittedEvent] = useState<EvoraEvent | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!hostName && user.displayName) setHostName(user.displayName);
    if (!hostEmail && user.email) setHostEmail(user.email);
  }, [user, hostName, hostEmail]);

  const handlePlaceSelected = (place: SelectedVenuePlace) => {
    setVenueName(place.venueName);
    setVenueAddress(place.venueAddress);
    if (place.city) setCity(place.city);
    setPlaceId(place.placeId);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setVerifiedVenueLabel(place.venueName);
  };

  const updateTier = (index: number, field: keyof DraftTier, value: string) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        name: 'Team Bundle',
        description: 'Group pass with priority check-in.',
        priceRupees: '999',
        capacity: '40',
      },
    ]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      const processed = await processCoverPhotoFile(file);
      setCustomPhoto(processed);
      setCoverImage(processed.dataUrl);
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Unable to process this image.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handlePhotoFile(e.target.files?.[0]);
  };

  const handlePhotoDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    void handlePhotoFile(e.dataTransfer.files?.[0]);
  };

  const handleRemoveCustomPhoto = () => {
    setCustomPhoto(null);
    setPhotoError('');
    setCoverImage(AVAILABLE_COVERS[0].url);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetForm = () => {
    setSubmittedEvent(null);
    setTitle('');
    setSubtitle('');
    setCity('');
    setVenueName('');
    setVenueAddress('');
    setPlaceId(undefined);
    setLatitude(undefined);
    setLongitude(undefined);
    setVerifiedVenueLabel('');
    setDescription('');
    setPayoutVpa('');
    setCustomPhoto(null);
    setCoverImage(AVAILABLE_COVERS[0].url);
    setErrorBanner('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErrorBanner('');

    const trimmedVpa = payoutVpa.trim();
    if (trimmedVpa && !UPI_VPA_REGEX.test(trimmedVpa)) {
      setErrorBanner('Enter a valid UPI ID (for example: yourclub@okaxis) or leave the UPI field blank.');
      return;
    }

    setSubmitting(true);

    try {
      const created = await createEvent({
        title,
        subtitle,
        category,
        city,
        venueName,
        venueAddress,
        placeId,
        latitude,
        longitude,
        dateLabel: isoDate,
        isoDate,
        timeLabel,
        timezone,
        coverImage,
        description,
        hostName,
        hostOrganization,
        hostEmail,
        payoutVpa: trimmedVpa || undefined,
        refundPolicySummary,
        tiers: tiers.map((t) => ({
          name: t.name,
          description: t.description,
          priceRupees: Math.max(0, Number.parseFloat(t.priceRupees) || 0),
          capacity: Math.max(1, Number.parseInt(t.capacity, 10) || 100),
        })),
      });

      const saved = await persistHostedEvent(created, user.uid);
      setSubmittedEvent(saved);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to submit event.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1040px] px-6 md:px-8 py-14 md:py-18">
          <h1 className="display-xxl text-[#000000]">Host an event</h1>
          <p className="mt-3 text-base text-[#5e5e5e] max-w-2xl leading-relaxed">
            Set up your college fest, tech hackathon, arts showcase, workshop, or live show. Submitted listings are reviewed by our team before going live.
          </p>
        </div>
      </section>

      <section className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1040px] px-6 md:px-8 py-14 md:py-16">
          {!authReady ? (
            <p className="text-sm text-[#5e5e5e]">Checking your account...</p>
          ) : !user ? (
            <div className="mx-auto max-w-md">
              <AuthCard
                heading="Sign in to host an event"
                subheading="Create an Evora account or sign in to submit listings and manage your campus event."
              />
            </div>
          ) : submittedEvent ? (
            <div className="mx-auto max-w-2xl border border-[#e2e2e2] glass-light p-8 md:p-12 rounded-2xl space-y-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#efefef] text-[#166534]">
                <CheckCircle2 size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono-tabular text-xs font-semibold uppercase tracking-wide text-[#5e5e5e]">
                  Pending Admin Review
                </p>
                <h2 className="mt-2 display-xl text-[#000000]">
                  Your event has been submitted
                </h2>
                <p className="mt-3 text-sm text-[#5e5e5e] leading-relaxed">
                  {submittedEvent.title} is now queued for review. Once approved by an Evora administrator, it will appear in the public directory and open for attendee bookings.
                </p>
              </div>

              <dl className="border-t border-b border-[#e2e2e2] py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-[#5e5e5e]">Event</dt>
                  <dd className="mt-1 font-medium text-[#000000]">{submittedEvent.title}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5e5e5e]">Date & City</dt>
                  <dd className="mt-1 font-mono-tabular text-[#000000]">
                    {submittedEvent.dateLabel} · {submittedEvent.city}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#5e5e5e]">Organizer</dt>
                  <dd className="mt-1 text-[#000000]">{submittedEvent.host.organization}</dd>
                </div>
                {submittedEvent.payoutVpa ? (
                  <div>
                    <dt className="text-xs text-[#5e5e5e]">Payout UPI ID</dt>
                    <dd className="mt-1 font-mono-tabular text-[#000000]">
                      {submittedEvent.payoutVpa}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/events/${submittedEvent.slug}`}
                  className="inline-flex items-center justify-center bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
                >
                  Preview Draft
                </Link>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center justify-center bg-[#ffffff] border border-[#e2e2e2] text-[#000000] text-sm font-medium px-5 py-3 rounded-full"
                >
                  Submit Another Event
                </button>
              </div>
            </div>
          ) : (
            <>
              {errorBanner ? (
                <div
                  role="alert"
                  className="mb-8 border border-[#b42318] glass-light p-5 text-sm text-[#b42318] rounded-xl"
                >
                  {errorBanner}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="border border-[#e2e2e2] glass-light p-7 md:p-10 space-y-6 rounded-2xl">
                  <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
                    1. Event details
                  </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label htmlFor="host-title" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Event title
                    </label>
                    <input
                      id="host-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="CodeFest 2026: 24-Hour Campus Hackathon"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="host-subtitle" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Short tagline
                    </label>
                    <input
                      id="host-subtitle"
                      type="text"
                      required
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Build across 4 tracks with mentors, meals, and live jury demos."
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="host-category" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Category
                    </label>
                    <select
                      id="host-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as EventCategory)}
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="host-city" className="block text-xs font-medium text-[#000000] mb-1.5">
                      City
                    </label>
                    <input
                      id="host-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Bengaluru"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="host-venue" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Venue / Campus (search to pin on map)
                    </label>
                    <VenueAutocompleteInput
                      value={venueName}
                      onChange={(val) => {
                        setVenueName(val);
                        setVerifiedVenueLabel('');
                        setPlaceId(undefined);
                        setLatitude(undefined);
                        setLongitude(undefined);
                      }}
                      onPlaceSelected={handlePlaceSelected}
                      verifiedLabel={verifiedVenueLabel}
                    />
                  </div>

                  <div>
                    <label htmlFor="host-address" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Full address
                    </label>
                    <input
                      id="host-address"
                      type="text"
                      required
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="Outer Ring Road, Bengaluru 560103"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="host-date" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Date
                    </label>
                    <input
                      id="host-date"
                      type="date"
                      required
                      value={isoDate}
                      onChange={(e) => setIsoDate(e.target.value)}
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="host-time" className="block text-xs font-medium text-[#000000] mb-1.5">
                        Time
                      </label>
                      <input
                        id="host-time"
                        type="text"
                        required
                        value={timeLabel}
                        onChange={(e) => setTimeLabel(e.target.value)}
                        placeholder="09:30 to 18:30"
                        className="w-full bg-[#efefef] px-3 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="host-tz" className="block text-xs font-medium text-[#000000] mb-1.5">
                        Timezone
                      </label>
                      <input
                        id="host-tz"
                        type="text"
                        required
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        placeholder="IST"
                        className="w-full bg-[#efefef] px-3 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="host-desc" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="host-desc"
                      rows={4}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Share schedule highlights, what participants should bring, ID rules, and team size limits."
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>
                </div>
              </div>

                <div className="border border-[#e2e2e2] glass-light p-7 md:p-10 space-y-6 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-[#e2e2e2]">
                    <h2 className="text-lg font-bold text-[#000000]">
                      2. Event cover photo
                    </h2>
                    <span className="text-xs text-[#5e5e5e]">
                      Upload your own poster or photo, or pick a preset below
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                    <div className="md:col-span-6">
                      <div className="relative overflow-hidden rounded-xl border border-[#e2e2e2] bg-[#efefef] aspect-[16/10] w-full">
                        <img
                          src={coverImage}
                          alt="Selected event cover preview"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover block"
                        />
                        {customPhoto ? (
                          <button
                            type="button"
                            onClick={handleRemoveCustomPhoto}
                            aria-label="Remove uploaded cover photo"
                            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 glass-light text-[#000000]"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-2.5 text-xs text-[#5e5e5e] font-mono-tabular">
                        {customPhoto
                          ? `Uploaded: ${customPhoto.fileName} · ${customPhoto.width}x${customPhoto.height} · ${customPhoto.sizeKb} KB`
                          : 'Live 16:10 event card preview'}
                      </p>
                    </div>

                    <div className="md:col-span-6 flex flex-col">
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(true);
                        }}
                        onDragLeave={() => setIsDraggingPhoto(false)}
                        onDrop={handlePhotoDrop}
                        className={`flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center ${
                          isDraggingPhoto
                            ? 'border-[#000000] bg-[#efefef]'
                            : 'border-[#afafaf] bg-white/75'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          id="host-cover-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoInputChange}
                          className="sr-only"
                        />
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] text-[#000000]">
                          <Upload size={18} aria-hidden="true" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[#000000]">
                          {uploadingPhoto
                            ? 'Optimizing your photo...'
                            : customPhoto
                              ? 'Upload a different photo'
                              : 'Upload your event photo'}
                        </p>
                        <p className="mt-1 text-xs text-[#5e5e5e] max-w-xs leading-relaxed">
                          Drag and drop a JPG, PNG, or WebP banner here, or browse from your device. Auto-cropped cleanly to 16:10 (up to 10 MB).
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                          <button
                            type="button"
                            disabled={uploadingPhoto}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-5 py-2.5 text-xs font-medium text-[#ffffff] whitespace-nowrap"
                          >
                            {customPhoto ? 'Replace Photo' : 'Choose Photo'}
                          </button>
                          {customPhoto ? (
                            <button
                              type="button"
                              onClick={handleRemoveCustomPhoto}
                              className="inline-flex items-center justify-center rounded-full border border-[#e2e2e2] bg-[#ffffff] px-4 py-2.5 text-xs font-medium text-[#000000] whitespace-nowrap"
                            >
                              Use Preset
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {photoError ? (
                        <p role="alert" className="mt-2.5 text-xs font-medium text-[#b42318]">
                          {photoError}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#e2e2e2]">
                    <p className="text-xs font-medium text-[#5e5e5e] mb-3">
                      Or pick a preset campus photo
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {AVAILABLE_COVERS.map((item) => {
                        const selected = !customPhoto && coverImage === item.url;
                        return (
                          <button
                            key={item.url}
                            type="button"
                            onClick={() => {
                              setCustomPhoto(null);
                              setPhotoError('');
                              setCoverImage(item.url);
                            }}
                            className={`text-left border p-2 rounded-xl ${
                              selected
                                ? 'border-[#000000] bg-[#efefef]'
                                : 'border-[#e2e2e2] bg-white/80'
                            }`}
                          >
                            <img
                              src={item.url}
                              alt={item.label}
                              referrerPolicy="no-referrer"
                              className="aspect-[16/10] w-full object-cover block rounded-lg"
                            />
                            <span className="mt-2 block text-xs font-medium text-[#000000]">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border border-[#e2e2e2] glass-light p-7 md:p-10 space-y-6 rounded-2xl">
                <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#e2e2e2]">
                  <h2 className="text-lg font-bold text-[#000000]">3. Ticket tiers</h2>
                  <button
                    type="button"
                    onClick={addTier}
                    className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-xs font-medium px-4 py-2 rounded-full"
                  >
                    Add Tier
                  </button>
                </div>

                <div className="space-y-6">
                  {tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="border border-[#e2e2e2] bg-[#f3f3f3] p-5 space-y-4 rounded-xl"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono-tabular text-xs font-semibold text-[#5e5e5e]">
                          TIER {String(idx + 1).padStart(2, '0')}
                        </span>
                        {tiers.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeTier(idx)}
                            className="text-xs font-medium text-[#b42318]"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#000000] mb-1">
                            Tier name
                          </label>
                          <input
                            type="text"
                            required
                            value={tier.name}
                            onChange={(e) => updateTier(idx, 'name', e.target.value)}
                            className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm text-[#000000] rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#000000] mb-1">
                            Price (INR, 0 for Free)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            required
                            value={tier.priceRupees}
                            onChange={(e) => updateTier(idx, 'priceRupees', e.target.value)}
                            className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm font-mono-tabular text-[#000000] rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#000000] mb-1">
                            Total spots
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={5000}
                            required
                            value={tier.capacity}
                            onChange={(e) => updateTier(idx, 'capacity', e.target.value)}
                            className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm font-mono-tabular text-[#000000] rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#000000] mb-1">
                          What is included
                        </label>
                        <input
                          type="text"
                          required
                          value={tier.description}
                          onChange={(e) => updateTier(idx, 'description', e.target.value)}
                          className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm text-[#000000] rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

                <div className="border border-[#e2e2e2] glass-light p-7 md:p-10 space-y-6 rounded-2xl">
                <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  4. Organizer contact & payouts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="org-person" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Your name
                    </label>
                    <input
                      id="org-person"
                      type="text"
                      required
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Rohan Mehta"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-name" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Club / College / Org
                    </label>
                    <input
                      id="org-name"
                      type="text"
                      required
                      value={hostOrganization}
                      onChange={(e) => setHostOrganization(e.target.value)}
                      placeholder="Campus Tech Society"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-email" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Contact email
                    </label>
                    <input
                      id="org-email"
                      type="email"
                      required
                      value={hostEmail}
                      onChange={(e) => setHostEmail(e.target.value)}
                      placeholder="fest@college.edu"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="org-vpa" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Organizer UPI ID / VPA (optional)
                    </label>
                    <input
                      id="org-vpa"
                      type="text"
                      value={payoutVpa}
                      onChange={(e) => setPayoutVpa(e.target.value)}
                      placeholder="yourclub@okaxis"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm font-mono-tabular text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                    <p className="mt-1.5 text-xs text-[#5e5e5e]">
                      For paid passes, attendee UPI QR payments route straight to this UPI ID.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="org-refund" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Refund policy
                    </label>
                    <input
                      id="org-refund"
                      type="text"
                      required
                      value={refundPolicySummary}
                      onChange={(e) => setRefundPolicySummary(e.target.value)}
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e2e2e2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-xs text-[#5e5e5e]">
                    Submissions are reviewed before going public. By submitting you agree to the Evora{' '}
                    <Link to="/terms" className="text-[#000000] underline">
                      Terms of Service
                    </Link>
                    .
                  </p>
                    <button
                      type="submit"
                      disabled={submitting || uploadingPhoto}
                      className="bg-[#000000] active:bg-[#282828] disabled:opacity-50 text-[#ffffff] text-sm font-medium px-6 py-3.5 rounded-full whitespace-nowrap"
                    >
                      {submitting ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
