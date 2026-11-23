import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, RefreshCw, Search, Shield, Trash2, X } from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { AuthCard } from '../components/AuthCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ADMIN_EMAIL,
  checkIsAdminUser,
  deleteEventAsAdmin,
  listAllHostedEventsForAdmin,
  updateEventApprovalStatus,
} from '../lib/firestoreStore.ts';
import { formatInr, formatIsoDateTime } from '../lib/format.ts';
import type { EventApprovalStatus, EvoraEvent } from '../types/ticketing.ts';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

function effectiveStatus(event: EvoraEvent): EventApprovalStatus {
  if (event.approvalStatus === 'pending' || event.approvalStatus === 'rejected') {
    return event.approvalStatus;
  }
  return 'approved';
}

export function AdminPage() {
  const { user, authReady, signOutUser, sendVerificationEmail } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [sendingVerification, setSendingVerification] = useState(false);

  const [events, setEvents] = useState<EvoraEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    setCheckingAdmin(true);
    checkIsAdminUser(user)
      .then((allowed) => {
        if (active) setIsAdmin(allowed);
      })
      .finally(() => {
        if (active) setCheckingAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user, authReady]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setLoadError('');
    try {
      const list = await listAllHostedEventsForAdmin();
      setEvents(list);
      setNotesById((prev) => {
        const next = { ...prev };
        list.forEach((evt) => {
          if (next[evt.id] === undefined) {
            next[evt.id] = evt.reviewNote || '';
          }
        });
        return next;
      });
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load submitted events.');
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadEvents();
    }
  }, [isAdmin, loadEvents]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    events.forEach((evt) => {
      const st = effectiveStatus(evt);
      if (st === 'pending') pending += 1;
      else if (st === 'rejected') rejected += 1;
      else approved += 1;
    });
    return {
      pending,
      approved,
      rejected,
      all: events.length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((evt) => {
      const st = effectiveStatus(evt);
      if (activeTab !== 'all' && st !== activeTab) {
        return false;
      }
      if (!q) return true;
      return (
        evt.title.toLowerCase().includes(q) ||
        evt.city.toLowerCase().includes(q) ||
        evt.venueName.toLowerCase().includes(q) ||
        evt.host.organization.toLowerCase().includes(q) ||
        evt.host.contactEmail.toLowerCase().includes(q) ||
        (evt.payoutVpa || '').toLowerCase().includes(q)
      );
    });
  }, [events, activeTab, searchQuery]);

  const handleSetStatus = async (evt: EvoraEvent, status: EventApprovalStatus) => {
    if (!user) return;
    setBusyEventId(evt.id);
    setActionMessage('');
    setLoadError('');
    try {
      const note = notesById[evt.id] ?? '';
      await updateEventApprovalStatus(evt.id, status, user.email || user.uid, note);
      setEvents((prev) =>
        prev.map((item) =>
          item.id === evt.id
            ? {
                ...item,
                approvalStatus: status,
                reviewNote: note.trim(),
                reviewedAt: new Date().toISOString(),
                reviewedBy: user.email || user.uid,
              }
            : item,
        ),
      );
      setActionMessage(
        status === 'approved'
          ? `Approved "${evt.title}". It is now live in the public directory.`
          : status === 'rejected'
            ? `Rejected "${evt.title}". It remains hidden from public listings.`
            : `Moved "${evt.title}" back to pending review.`,
      );
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to update event status.');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDelete = async (evt: EvoraEvent) => {
    setBusyEventId(evt.id);
    setActionMessage('');
    setLoadError('');
    try {
      await deleteEventAsAdmin(evt.id);
      setEvents((prev) => prev.filter((item) => item.id !== evt.id));
      setConfirmDeleteId(null);
      setActionMessage(`Deleted "${evt.title}" permanently.`);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to delete event.');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleSendVerification = async () => {
    setVerificationError('');
    setSendingVerification(true);
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
    } catch (err: unknown) {
      setVerificationError(
        err instanceof Error ? err.message : 'Unable to send verification email.',
      );
    } finally {
      setSendingVerification(false);
    }
  };

  const needsAdminEmailVerification = Boolean(
    user &&
      !isAdmin &&
      user.email?.toLowerCase() === ADMIN_EMAIL &&
      !user.emailVerified,
  );

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="font-mono-tabular text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
                Evora Moderation
              </p>
              <h1 className="mt-2 display-xxl text-[#000000]">Admin Portal</h1>
              <p className="mt-2 text-sm text-[#5e5e5e] max-w-xl leading-relaxed">
                Review event submissions, verify organizer payout UPI details, and approve listings before they appear on the platform.
              </p>
            </div>

            {isAdmin && user ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono-tabular text-xs text-[#5e5e5e]">
                  {user.email}
                </span>
                <button
                  type="button"
                  disabled={loadingEvents}
                  onClick={() => {
                    void loadEvents();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-4 py-2 text-xs font-medium text-[#000000] disabled:opacity-50"
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  <span>{loadingEvents ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void signOutUser();
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-[#000000] active:bg-[#282828] px-4 py-2 text-xs font-medium text-[#ffffff]"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-12 md:py-16">
          {!authReady || checkingAdmin ? (
            <p className="text-sm text-[#5e5e5e]">Verifying administrator access...</p>
          ) : !user ? (
            <div className="mx-auto max-w-md">
              <AuthCard
                heading="Admin sign in"
                subheading="Sign in with your authorized Evora administrator account to review submitted events."
              />
            </div>
          ) : needsAdminEmailVerification ? (
            <div className="mx-auto max-w-lg border border-[#e2e2e2] glass-light p-8 md:p-10 rounded-2xl space-y-5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] text-[#000000]">
                <Shield size={20} aria-hidden="true" />
              </div>
              <div>
                <h2 className="display-md text-[#000000]">Verify your email to unlock admin access</h2>
                <p className="mt-2 text-sm text-[#5e5e5e] leading-relaxed">
                  You are signed in as <span className="font-mono-tabular text-[#000000]">{user.email}</span>, but email verification is required before Firestore grants administrator write access. You can verify via email link below or sign in with Google directly.
                </p>
              </div>
              {verificationError ? (
                <div
                  role="alert"
                  className="border border-[#b42318] bg-[#ffffff] px-4 py-3 text-xs text-[#b42318] rounded-lg"
                >
                  {verificationError}
                </div>
              ) : null}
              {verificationSent ? (
                <div className="border border-[#166534] bg-[#ffffff] px-4 py-3 text-xs text-[#166534] rounded-lg">
                  Verification link sent to {user.email}. Open the link in your inbox, then click Refresh Status below.
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={sendingVerification}
                  onClick={handleSendVerification}
                  className="rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-5 py-2.5 text-xs font-medium text-[#ffffff]"
                >
                  {sendingVerification ? 'Sending...' : 'Send Verification Email'}
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-5 py-2.5 text-xs font-medium text-[#000000]"
                >
                  Refresh Status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void signOutUser();
                  }}
                  className="rounded-full border border-[#e2e2e2] bg-[#efefef] px-5 py-2.5 text-xs font-medium text-[#000000]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : !isAdmin ? (
            <div className="mx-auto max-w-lg border border-[#e2e2e2] glass-light p-8 md:p-10 rounded-2xl space-y-5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] text-[#b42318]">
                <Shield size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono-tabular text-xs text-[#5e5e5e]">403 · RESTRICTED</p>
                <h2 className="mt-2 display-md text-[#000000]">Administrator access required</h2>
                <p className="mt-2 text-sm text-[#5e5e5e] leading-relaxed">
                  The account <span className="font-mono-tabular text-[#000000]">{user.email}</span> does not have administrator permissions for Evora.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    void signOutUser();
                  }}
                  className="rounded-full bg-[#000000] active:bg-[#282828] px-5 py-2.5 text-xs font-medium text-[#ffffff]"
                >
                  Sign Out & Switch Account
                </button>
                <Link
                  to="/"
                  className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-5 py-2.5 text-xs font-medium text-[#000000]"
                >
                  Return Home
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                  <p className="text-xs text-[#5e5e5e]">Pending Review</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#000000]">
                    {counts.pending}
                  </p>
                </div>
                <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                  <p className="text-xs text-[#5e5e5e]">Approved Live</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#166534]">
                    {counts.approved}
                  </p>
                </div>
                <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                  <p className="text-xs text-[#5e5e5e]">Rejected</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#b42318]">
                    {counts.rejected}
                  </p>
                </div>
                <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                  <p className="text-xs text-[#5e5e5e]">Total Submissions</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#000000]">
                    {counts.all}
                  </p>
                </div>
              </div>

              {loadError ? (
                <div
                  role="alert"
                  className="border border-[#b42318] glass-light px-5 py-4 text-sm text-[#b42318] rounded-xl"
                >
                  {loadError}
                </div>
              ) : null}

              {actionMessage ? (
                <div
                  role="status"
                  className="border border-[#166534] glass-light px-5 py-4 text-sm text-[#166534] rounded-xl"
                >
                  {actionMessage}
                </div>
              ) : null}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div
                  role="tablist"
                  aria-label="Filter submissions by moderation status"
                  className="inline-flex flex-wrap gap-2 rounded-2xl glass-light border border-white/70 p-2"
                >
                  {(
                    [
                      { key: 'pending', label: 'Pending', count: counts.pending },
                      { key: 'approved', label: 'Approved', count: counts.approved },
                      { key: 'rejected', label: 'Rejected', count: counts.rejected },
                      { key: 'all', label: 'All', count: counts.all },
                    ] as const
                  ).map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap ${
                          active
                            ? 'bg-[#000000] text-[#ffffff]'
                            : 'bg-black/5 text-[#000000]'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`font-mono-tabular text-[11px] ${
                            active ? 'text-[#afafaf]' : 'text-[#5e5e5e]'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full md:w-80">
                  <Search
                    size={15}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e5e]"
                  />
                  <label htmlFor="admin-search" className="sr-only">
                    Search submitted events
                  </label>
                  <input
                    id="admin-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, org, city, or UPI VPA"
                    className="w-full rounded-xl border border-[#e2e2e2] bg-[#ffffff] pl-10 pr-4 py-2.5 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
                  />
                </div>
              </div>

              {loadingEvents && events.length === 0 ? (
                <div className="border border-[#e2e2e2] glass-light rounded-2xl p-10 text-center">
                  <p className="text-sm text-[#5e5e5e]">Loading submitted events...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="border border-[#e2e2e2] glass-light rounded-2xl p-12 text-center">
                  <h2 className="text-lg font-bold text-[#000000]">
                    No events in this queue
                  </h2>
                  <p className="mt-2 text-sm text-[#5e5e5e]">
                    {activeTab === 'pending'
                      ? 'All submitted events have been reviewed.'
                      : 'Try switching tabs or clearing your search filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredEvents.map((evt) => {
                    const status = effectiveStatus(evt);
                    const isBusy = busyEventId === evt.id;
                    const confirmingDelete = confirmDeleteId === evt.id;

                    return (
                      <article
                        key={evt.id}
                        className="border border-[#e2e2e2] glass-light rounded-2xl p-6 md:p-7"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          <div className="lg:col-span-4">
                            <div className="overflow-hidden rounded-xl border border-[#e2e2e2] bg-[#efefef] aspect-[16/10]">
                              <img
                                src={evt.coverImage}
                                alt={evt.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover block"
                              />
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                              <span
                                className={`font-mono-tabular font-semibold uppercase tracking-wide ${
                                  status === 'approved'
                                    ? 'text-[#166534]'
                                    : status === 'rejected'
                                      ? 'text-[#b42318]'
                                      : 'text-[#000000]'
                                }`}
                              >
                                {status === 'pending'
                                  ? 'Pending Review'
                                  : status === 'approved'
                                    ? 'Approved'
                                    : 'Rejected'}
                              </span>
                              <span className="font-mono-tabular text-[#5e5e5e]">
                                {evt.createdAt ? formatIsoDateTime(evt.createdAt) : ''}
                              </span>
                            </div>
                          </div>

                          <div className="lg:col-span-8 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div>
                                <p className="text-xs text-[#5e5e5e]">
                                  {evt.category} · {evt.city} · {evt.dateLabel} · {evt.timeLabel}
                                </p>
                                <h2 className="mt-1.5 display-md text-[#000000]">{evt.title}</h2>
                                <p className="mt-1 text-sm text-[#5e5e5e]">{evt.subtitle}</p>
                              </div>
                              <Link
                                to={`/events/${evt.slug}`}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-2 text-xs font-medium text-[#000000] whitespace-nowrap shrink-0"
                              >
                                <span>Preview</span>
                                <ExternalLink size={12} aria-hidden="true" />
                              </Link>
                            </div>

                            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-[#e2e2e2] py-4 text-xs">
                              <div>
                                <dt className="text-[#5e5e5e]">Organizer</dt>
                                <dd className="mt-1 font-medium text-[#000000]">
                                  {evt.host.name} · {evt.host.organization}
                                </dd>
                                <dd className="mt-0.5 font-mono-tabular text-[#5e5e5e]">
                                  {evt.host.contactEmail}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[#5e5e5e]">Venue</dt>
                                <dd className="mt-1 font-medium text-[#000000]">{evt.venueName}</dd>
                                <dd className="mt-0.5 text-[#5e5e5e]">{evt.venueAddress}</dd>
                              </div>
                              <div>
                                <dt className="text-[#5e5e5e]">Payout UPI VPA</dt>
                                <dd className="mt-1 font-mono-tabular font-medium text-[#000000]">
                                  {evt.payoutVpa || 'Not provided (default)'}
                                </dd>
                                <dd className="mt-1 font-mono-tabular text-[#5e5e5e]">
                                  {evt.tiers.length}{' '}
                                  {evt.tiers.length === 1 ? 'tier' : 'tiers'} · From{' '}
                                  {formatInr(Math.min(...evt.tiers.map((t) => t.pricePaise)))}
                                </dd>
                              </div>
                            </dl>

                            <div>
                              <label
                                htmlFor={`note-${evt.id}`}
                                className="block text-xs font-medium text-[#000000] mb-1.5"
                              >
                                Review note (optional, visible to organizer on draft preview)
                              </label>
                              <input
                                id={`note-${evt.id}`}
                                type="text"
                                value={notesById[evt.id] ?? ''}
                                onChange={(e) =>
                                  setNotesById((prev) => ({ ...prev, [evt.id]: e.target.value }))
                                }
                                placeholder="Add a note for approval or rejection reason"
                                className="w-full rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-2.5 text-xs text-[#000000] placeholder:text-[#5e5e5e]"
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                              <div className="flex flex-wrap items-center gap-2.5">
                                {status !== 'approved' ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => {
                                      void handleSetStatus(evt, 'approved');
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-4 py-2 text-xs font-medium text-[#ffffff]"
                                  >
                                    <Check size={13} aria-hidden="true" />
                                    <span>{isBusy ? 'Updating...' : 'Approve'}</span>
                                  </button>
                                ) : null}

                                {status !== 'rejected' ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => {
                                      void handleSetStatus(evt, 'rejected');
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#b42318] bg-[#ffffff] disabled:opacity-50 px-4 py-2 text-xs font-medium text-[#b42318]"
                                  >
                                    <X size={13} aria-hidden="true" />
                                    <span>Reject</span>
                                  </button>
                                ) : null}

                                {status !== 'pending' ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => {
                                      void handleSetStatus(evt, 'pending');
                                    }}
                                    className="inline-flex items-center rounded-full border border-[#e2e2e2] bg-[#ffffff] disabled:opacity-50 px-4 py-2 text-xs font-medium text-[#000000]"
                                  >
                                    Move to Pending
                                  </button>
                                ) : null}
                              </div>

                              <div>
                                {!confirmingDelete ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setConfirmDeleteId(evt.id)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-2 text-xs font-medium text-[#b42318]"
                                  >
                                    <Trash2 size={13} aria-hidden="true" />
                                    <span>Delete</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        void handleDelete(evt);
                                      }}
                                      className="rounded-full bg-[#b42318] px-3.5 py-2 text-xs font-medium text-[#ffffff]"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-2 text-xs font-medium text-[#000000]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
