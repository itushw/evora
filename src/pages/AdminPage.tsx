import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Star,
  Ticket,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { AdminEventEditorModal } from '../components/admin/AdminEventEditorModal.tsx';
import { AdminOrdersPanel } from '../components/admin/AdminOrdersPanel.tsx';
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel.tsx';
import { AdminSettingsPanel } from '../components/admin/AdminSettingsPanel.tsx';
import { formatFirebaseAuthError, useAuth } from '../context/AuthContext.tsx';
import {
  checkIsAdminUser,
  deleteEventAsAdmin,
  isGoogleSsoSession,
  listAdminRecords,
  listAllEventsForAdmin,
  listAllOrdersForAdmin,
  listAllUsersForAdmin,
  saveFullEventAsAdmin,
  updateEventApprovalStatus,
} from '../lib/firestoreStore.ts';
import { formatInr, formatIsoDateTime } from '../lib/format.ts';
import type {
  AdminRecord,
  EventApprovalStatus,
  EvoraEvent,
  TicketOrder,
  UserProfileRecord,
} from '../types/ticketing.ts';

type AdminSection = 'events' | 'orders' | 'users' | 'settings';
type EventFilterTab = 'pending' | 'approved' | 'rejected' | 'all';
type AdminEventRow = EvoraEvent & { source: 'firestore' | 'seed' };

function effectiveStatus(event: EvoraEvent): EventApprovalStatus {
  if (event.approvalStatus === 'pending' || event.approvalStatus === 'rejected') {
    return event.approvalStatus;
  }
  return 'approved';
}

export function AdminPage() {
  const { user, authReady, signInWithGoogle, signOutUser } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isGoogleSso, setIsGoogleSso] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState('');

  const [activeSection, setActiveSection] = useState<AdminSection>('events');
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [users, setUsers] = useState<UserProfileRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [eventFilterTab, setEventFilterTab] = useState<EventFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EvoraEvent | null>(null);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    setCheckingAdmin(true);
    Promise.all([isGoogleSsoSession(user), checkIsAdminUser(user)])
      .then(([googleOk, allowed]) => {
        if (active) {
          setIsGoogleSso(googleOk);
          setIsAdmin(allowed);
        }
      })
      .finally(() => {
        if (active) setCheckingAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user, authReady]);

  const loadAllAdminData = useCallback(async () => {
    setLoadingData(true);
    setLoadError('');
    try {
      const [eventsRes, ordersRes, usersRes, adminsRes] = await Promise.all([
        listAllEventsForAdmin(),
        listAllOrdersForAdmin(),
        listAllUsersForAdmin(),
        listAdminRecords(),
      ]);

      setEvents(eventsRes);
      setOrders(ordersRes);
      setUsers(usersRes);
      setAdmins(adminsRes);

      setNotesById((prev) => {
        const next = { ...prev };
        eventsRes.forEach((evt) => {
          if (next[evt.id] === undefined) {
            next[evt.id] = evt.reviewNote || '';
          }
        });
        return next;
      });
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load admin workspace data.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadAllAdminData();
    }
  }, [isAdmin, loadAllAdminData]);

  const eventCounts = useMemo(() => {
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
      if (eventFilterTab !== 'all' && st !== eventFilterTab) {
        return false;
      }
      if (!q) return true;
      return (
        evt.title.toLowerCase().includes(q) ||
        evt.slug.toLowerCase().includes(q) ||
        evt.city.toLowerCase().includes(q) ||
        evt.venueName.toLowerCase().includes(q) ||
        evt.host.organization.toLowerCase().includes(q) ||
        evt.host.contactEmail.toLowerCase().includes(q) ||
        (evt.payoutVpa || '').toLowerCase().includes(q)
      );
    });
  }, [events, eventFilterTab, searchQuery]);

  const handleSetStatus = async (evt: AdminEventRow, status: EventApprovalStatus) => {
    if (!user) return;
    setBusyEventId(evt.id);
    setActionMessage('');
    setLoadError('');
    try {
      const note = notesById[evt.id] ?? '';
      await updateEventApprovalStatus(
        evt.id,
        status,
        user.email || user.uid,
        note,
        evt.source === 'seed' ? evt : undefined,
        user.uid,
      );
      setEvents((prev) =>
        prev.map((item) =>
          item.id === evt.id
            ? {
                ...item,
                source: 'firestore',
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
            ? `Rejected/hidden "${evt.title}". It is hidden from public listings.`
            : `Moved "${evt.title}" back to pending review.`,
      );
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to update event status.');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleToggleFeatured = async (evt: AdminEventRow) => {
    if (!user) return;
    setBusyEventId(evt.id);
    setActionMessage('');
    setLoadError('');
    try {
      const nextFeatured = !evt.featured;
      const saved = await saveFullEventAsAdmin(
        {
          ...evt,
          featured: nextFeatured,
        },
        user.uid,
        user.email || user.uid,
      );
      setEvents((prev) =>
        prev.map((item) =>
          item.id === evt.id ? { ...saved, source: 'firestore' } : item,
        ),
      );
      setActionMessage(
        nextFeatured
          ? `Marked "${evt.title}" as a featured event.`
          : `Removed featured highlight from "${evt.title}".`,
      );
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to toggle featured flag.');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleSaveEditorEvent = async (assembled: EvoraEvent) => {
    if (!user) return;
    setActionMessage('');
    setLoadError('');
    const saved = await saveFullEventAsAdmin(assembled, user.uid, user.email || user.uid);
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      const nextRow: AdminEventRow = { ...saved, source: 'firestore' };
      if (exists) {
        return prev.map((e) => (e.id === saved.id ? nextRow : e));
      }
      return [nextRow, ...prev];
    });
    setNotesById((prev) => ({ ...prev, [saved.id]: saved.reviewNote || '' }));
    setActionMessage(
      editingEvent
        ? `Saved all changes to "${saved.title}".`
        : `Created and saved "${saved.title}" (${saved.approvalStatus || 'approved'}).`,
    );
  };

  const handleDelete = async (evt: AdminEventRow) => {
    setBusyEventId(evt.id);
    setActionMessage('');
    setLoadError('');
    try {
      await deleteEventAsAdmin(evt.id);
      await loadAllAdminData();
      setConfirmDeleteId(null);
      setActionMessage(`Deleted "${evt.title}" from Firestore.`);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Unable to delete event.');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setGoogleAuthError('');
    setGoogleSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setGoogleAuthError(formatFirebaseAuthError(err));
    } finally {
      setGoogleSigningIn(false);
    }
  };

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="font-mono-tabular text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
                Evora Control Center
              </p>
              <h1 className="mt-2 display-xxl text-[#000000]">Admin Portal</h1>
              <p className="mt-2 text-sm text-[#5e5e5e] max-w-2xl leading-relaxed">
                Full administrative control over all events, ticket inventory, attendee orders, gate check-ins, user accounts, co-admins, and live platform settings.
              </p>
            </div>

            {isAdmin && user ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono-tabular text-xs text-[#5e5e5e]">
                  {user.email}
                </span>
                <button
                  type="button"
                  disabled={loadingData}
                  onClick={() => {
                    void loadAllAdminData();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-4 py-2 text-xs font-medium text-[#000000] disabled:opacity-50"
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  <span>{loadingData ? 'Refreshing...' : 'Refresh All'}</span>
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

          {isAdmin && user ? (
            <div
              role="tablist"
              aria-label="Admin control sections"
              className="mt-8 flex flex-wrap gap-2"
            >
              {(
                [
                  {
                    key: 'events',
                    label: 'Events',
                    count: eventCounts.all,
                    icon: CalendarDays,
                  },
                  {
                    key: 'orders',
                    label: 'Orders & Check-In',
                    count: orders.length,
                    icon: Ticket,
                  },
                  {
                    key: 'users',
                    label: 'Users & Admins',
                    count: users.length,
                    icon: Users,
                  },
                  {
                    key: 'settings',
                    label: 'Site Settings',
                    count: null,
                    icon: Settings,
                  },
                ] as const
              ).map((sec) => {
                const active = activeSection === sec.key;
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setActiveSection(sec.key);
                      setActionMessage('');
                      setLoadError('');
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium whitespace-nowrap ${
                      active
                        ? 'bg-[#000000] text-[#ffffff]'
                        : 'border border-[#e2e2e2] bg-[#f3f3f3] text-[#000000]'
                    }`}
                  >
                    <Icon size={14} aria-hidden="true" />
                    <span>{sec.label}</span>
                    {sec.count !== null ? (
                      <span
                        className={`font-mono-tabular text-[11px] ${
                          active ? 'text-[#afafaf]' : 'text-[#5e5e5e]'
                        }`}
                      >
                        {sec.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-12 md:py-16">
          {!authReady || checkingAdmin ? (
            <p className="text-sm text-[#5e5e5e]">Verifying administrator access...</p>
          ) : !user ? (
            <div className="mx-auto max-w-md border border-[#e2e2e2] glass-light p-8 md:p-10 rounded-2xl space-y-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] text-[#000000]">
                <Shield size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono-tabular text-xs uppercase tracking-wide text-[#5e5e5e]">
                  Google SSO Only
                </p>
                <h2 className="mt-2 display-md text-[#000000]">Admin sign in</h2>
                <p className="mt-2 text-sm text-[#5e5e5e] leading-relaxed">
                  Administrator access is restricted exclusively to authorized Google SSO accounts. Email and password sign-in is disabled for admin accounts.
                </p>
              </div>
              {googleAuthError ? (
                <div
                  role="alert"
                  className="border border-[#b42318] bg-[#ffffff] px-4 py-3 text-xs text-[#b42318] rounded-xl"
                >
                  {googleAuthError}
                </div>
              ) : null}
              <button
                type="button"
                disabled={googleSigningIn}
                onClick={() => {
                  void handleGoogleAdminSignIn();
                }}
                className="w-full rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-5 py-3.5 text-sm font-medium text-[#ffffff]"
              >
                {googleSigningIn ? 'Opening Google SSO...' : 'Continue with Google SSO'}
              </button>
            </div>
          ) : !isGoogleSso ? (
            <div className="mx-auto max-w-lg border border-[#e2e2e2] glass-light p-8 md:p-10 rounded-2xl space-y-5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#efefef] text-[#000000]">
                <Shield size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono-tabular text-xs uppercase tracking-wide text-[#5e5e5e]">
                  Google SSO Required
                </p>
                <h2 className="mt-2 display-md text-[#000000]">Sign in with Google SSO to continue</h2>
                <p className="mt-2 text-sm text-[#5e5e5e] leading-relaxed">
                  You are currently signed in as{' '}
                  <span className="font-mono-tabular text-[#000000]">{user.email}</span> using email and password. For security, Evora restricts all admin accounts and Firestore admin rules to Google SSO sessions only.
                </p>
              </div>
              {googleAuthError ? (
                <div
                  role="alert"
                  className="border border-[#b42318] bg-[#ffffff] px-4 py-3 text-xs text-[#b42318] rounded-xl"
                >
                  {googleAuthError}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={googleSigningIn}
                  onClick={() => {
                    void handleGoogleAdminSignIn();
                  }}
                  className="rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-5 py-2.5 text-xs font-medium text-[#ffffff]"
                >
                  {googleSigningIn ? 'Opening Google SSO...' : 'Switch to Google SSO'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void signOutUser();
                  }}
                  className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-5 py-2.5 text-xs font-medium text-[#000000]"
                >
                  Sign Out
                </button>
                <Link
                  to="/"
                  className="rounded-full border border-[#e2e2e2] bg-[#efefef] px-5 py-2.5 text-xs font-medium text-[#000000]"
                >
                  Return Home
                </Link>
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
                  The Google account <span className="font-mono-tabular text-[#000000]">{user.email}</span> does not have administrator permissions for Evora.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={googleSigningIn}
                  onClick={() => {
                    void handleGoogleAdminSignIn();
                  }}
                  className="rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-5 py-2.5 text-xs font-medium text-[#ffffff]"
                >
                  {googleSigningIn ? 'Opening Google SSO...' : 'Switch Google Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void signOutUser();
                  }}
                  className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-5 py-2.5 text-xs font-medium text-[#000000]"
                >
                  Sign Out
                </button>
                <Link
                  to="/"
                  className="rounded-full border border-[#e2e2e2] bg-[#efefef] px-5 py-2.5 text-xs font-medium text-[#000000]"
                >
                  Return Home
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
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

              {activeSection === 'events' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                      <p className="text-xs text-[#5e5e5e]">Pending Review</p>
                      <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#000000]">
                        {eventCounts.pending}
                      </p>
                    </div>
                    <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                      <p className="text-xs text-[#5e5e5e]">Approved Live</p>
                      <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#166534]">
                        {eventCounts.approved}
                      </p>
                    </div>
                    <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                      <p className="text-xs text-[#5e5e5e]">Rejected / Hidden</p>
                      <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#b42318]">
                        {eventCounts.rejected}
                      </p>
                    </div>
                    <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
                      <p className="text-xs text-[#5e5e5e]">Total Managed Events</p>
                      <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#000000]">
                        {eventCounts.all}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div
                      role="tablist"
                      aria-label="Filter events by moderation status"
                      className="inline-flex flex-wrap gap-2 rounded-2xl glass-light border border-white/70 p-2"
                    >
                      {(
                        [
                          { key: 'all', label: 'All Events', count: eventCounts.all },
                          { key: 'pending', label: 'Pending', count: eventCounts.pending },
                          { key: 'approved', label: 'Approved', count: eventCounts.approved },
                          { key: 'rejected', label: 'Hidden', count: eventCounts.rejected },
                        ] as const
                      ).map((tab) => {
                        const active = eventFilterTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setEventFilterTab(tab.key)}
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

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="relative w-full sm:w-72">
                        <Search
                          size={15}
                          aria-hidden="true"
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e5e]"
                        />
                        <label htmlFor="admin-event-search" className="sr-only">
                          Search events
                        </label>
                        <input
                          id="admin-event-search"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search title, slug, city, UPI"
                          className="w-full rounded-xl border border-[#e2e2e2] bg-[#ffffff] pl-10 pr-4 py-2.5 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(null);
                          setEditorOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#000000] active:bg-[#282828] px-5 py-2.5 text-xs font-medium text-[#ffffff] whitespace-nowrap"
                      >
                        <Plus size={14} aria-hidden="true" />
                        <span>Create Event</span>
                      </button>
                    </div>
                  </div>

                  {loadingData && events.length === 0 ? (
                    <div className="border border-[#e2e2e2] glass-light rounded-2xl p-10 text-center">
                      <p className="text-sm text-[#5e5e5e]">Loading events...</p>
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="border border-[#e2e2e2] glass-light rounded-2xl p-12 text-center">
                      <h2 className="text-lg font-bold text-[#000000]">No events match this view</h2>
                      <p className="mt-2 text-sm text-[#5e5e5e]">
                        Try another filter tab, clear your search, or create a new event directly.
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
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
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
                                        : 'Hidden / Rejected'}
                                  </span>
                                  <span className="font-mono-tabular text-[11px] text-[#5e5e5e]">
                                    {evt.source === 'seed' ? 'Built-in Seed' : 'Firestore Live'}
                                  </span>
                                </div>
                                {evt.createdAt ? (
                                  <p className="mt-1 font-mono-tabular text-[11px] text-[#5e5e5e]">
                                    {formatIsoDateTime(evt.createdAt)}
                                  </p>
                                ) : null}
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
                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        void handleToggleFeatured(evt);
                                      }}
                                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium whitespace-nowrap ${
                                        evt.featured
                                          ? 'bg-[#000000] text-[#ffffff]'
                                          : 'border border-[#e2e2e2] bg-[#ffffff] text-[#000000]'
                                      }`}
                                    >
                                      <Star size={12} aria-hidden="true" />
                                      <span>{evt.featured ? 'Featured' : 'Feature'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        setEditingEvent(evt);
                                        setEditorOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-[#000000] bg-[#ffffff] px-3.5 py-2 text-xs font-medium text-[#000000] whitespace-nowrap"
                                    >
                                      <Edit3 size={12} aria-hidden="true" />
                                      <span>Edit Everything</span>
                                    </button>
                                    <Link
                                      to={`/events/${evt.slug}`}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-2 text-xs font-medium text-[#000000] whitespace-nowrap"
                                    >
                                      <span>Preview</span>
                                      <ExternalLink size={12} aria-hidden="true" />
                                    </Link>
                                  </div>
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
                                    <dt className="text-[#5e5e5e]">Payout UPI & Inventory</dt>
                                    <dd className="mt-1 font-mono-tabular font-medium text-[#000000]">
                                      {evt.payoutVpa || 'Platform fallback UPI'}
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
                                    Review note (optional, visible on draft preview)
                                  </label>
                                  <input
                                    id={`note-${evt.id}`}
                                    type="text"
                                    value={notesById[evt.id] ?? ''}
                                    onChange={(e) =>
                                      setNotesById((prev) => ({
                                        ...prev,
                                        [evt.id]: e.target.value,
                                      }))
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
                                        <span>{evt.source === 'seed' ? 'Hide' : 'Reject'}</span>
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

                                  {evt.source === 'firestore' ? (
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
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeSection === 'orders' ? (
                <AdminOrdersPanel
                  orders={orders}
                  loading={loadingData}
                  onOrdersChange={setOrders}
                  onStatusMessage={setActionMessage}
                  onErrorMessage={setLoadError}
                />
              ) : activeSection === 'users' ? (
                <AdminUsersPanel
                  users={users}
                  admins={admins}
                  currentUid={user.uid}
                  loading={loadingData}
                  onUsersChange={setUsers}
                  onAdminsChange={setAdmins}
                  onStatusMessage={setActionMessage}
                  onErrorMessage={setLoadError}
                />
              ) : (
                <AdminSettingsPanel
                  adminEmail={user.email || user.uid}
                  onStatusMessage={setActionMessage}
                  onErrorMessage={setLoadError}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {editorOpen ? (
        <AdminEventEditorModal
          initialEvent={editingEvent}
          onClose={() => {
            setEditorOpen(false);
            setEditingEvent(null);
          }}
          onSave={handleSaveEditorEvent}
        />
      ) : null}
    </PageTransition>
  );
}
