import { useMemo, useState, type FormEvent } from 'react';
import { Shield, ShieldOff, Search, Trash2, UserPlus } from 'lucide-react';
import {
  ADMIN_EMAIL,
  deleteUserProfileAsAdmin,
  grantAdminAccess,
  revokeAdminAccess,
  updateUserNameAsAdmin,
} from '../../lib/firestoreStore.ts';
import { formatIsoDateTime } from '../../lib/format.ts';
import type { AdminRecord, UserProfileRecord } from '../../types/ticketing.ts';

interface AdminUsersPanelProps {
  users: UserProfileRecord[];
  admins: AdminRecord[];
  currentUid: string;
  loading: boolean;
  onUsersChange: (next: UserProfileRecord[]) => void;
  onAdminsChange: (next: AdminRecord[]) => void;
  onStatusMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

export function AdminUsersPanel({
  users,
  admins,
  currentUid,
  loading,
  onUsersChange,
  onAdminsChange,
  onStatusMessage,
  onErrorMessage,
}: AdminUsersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  const [manualUid, setManualUid] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [addingManual, setAddingManual] = useState(false);

  const adminUidSet = useMemo(() => new Set(admins.map((a) => a.uid)), [admins]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const handleGrantAdmin = async (uid: string, email: string) => {
    setBusyUid(uid);
    onErrorMessage('');
    onStatusMessage('');
    try {
      const record = await grantAdminAccess(uid, email);
      onAdminsChange([record, ...admins.filter((a) => a.uid !== uid)]);
      onStatusMessage(`Granted full admin access to ${email}.`);
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to grant admin access.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleRevokeAdmin = async (uid: string, email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL) {
      onErrorMessage('Primary owner admin cannot be revoked from the panel.');
      return;
    }
    setBusyUid(uid);
    onErrorMessage('');
    onStatusMessage('');
    try {
      await revokeAdminAccess(uid);
      onAdminsChange(admins.filter((a) => a.uid !== uid));
      onStatusMessage(`Revoked admin access from ${email}.`);
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to revoke admin access.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleSaveName = async (userRec: UserProfileRecord) => {
    const nextName = (editingNames[userRec.uid] ?? userRec.displayName).trim();
    if (!nextName || nextName === userRec.displayName) return;
    setBusyUid(userRec.uid);
    onErrorMessage('');
    onStatusMessage('');
    try {
      await updateUserNameAsAdmin(userRec.uid, nextName);
      onUsersChange(
        users.map((u) => (u.uid === userRec.uid ? { ...u, displayName: nextName } : u)),
      );
      onStatusMessage(`Updated display name for ${userRec.email}.`);
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to update user profile.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleDeleteUser = async (userRec: UserProfileRecord) => {
    setBusyUid(userRec.uid);
    onErrorMessage('');
    onStatusMessage('');
    try {
      await deleteUserProfileAsAdmin(userRec.uid);
      onUsersChange(users.filter((u) => u.uid !== userRec.uid));
      setConfirmDeleteUid(null);
      onStatusMessage(`Removed profile document for ${userRec.email}.`);
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to delete user profile.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleAddManualAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualUid.trim() || !manualEmail.trim()) return;
    setAddingManual(true);
    onErrorMessage('');
    onStatusMessage('');
    try {
      const record = await grantAdminAccess(manualUid.trim(), manualEmail.trim());
      onAdminsChange([record, ...admins.filter((a) => a.uid !== record.uid)]);
      setManualUid('');
      setManualEmail('');
      onStatusMessage(`Added co-admin ${record.email}.`);
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to add co-admin.');
    } finally {
      setAddingManual(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Co-Admins Management */}
      <div className="border border-[#e2e2e2] glass-light rounded-2xl p-6 md:p-7 space-y-5">
        <div className="pb-4 border-b border-[#e2e2e2]">
          <h2 className="text-lg font-bold text-[#000000]">Administrators (Google SSO Only)</h2>
          <p className="mt-1 text-xs text-[#5e5e5e]">
            Primary owner ({ADMIN_EMAIL}) and all co-admins must sign in with Google SSO. Email/password sessions are blocked by Firestore rules and the Admin Portal.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#000000] bg-[#ffffff] px-4 py-3 text-xs">
            <div>
              <p className="font-mono-tabular font-semibold text-[#000000]">{ADMIN_EMAIL}</p>
              <p className="text-[#5e5e5e]">Primary Owner Admin (Google SSO Enforced)</p>
            </div>
            <span className="font-mono-tabular text-[11px] font-semibold uppercase text-[#166534]">
              Root Admin
            </span>
          </div>

          {admins.map((adm) => (
            <div
              key={adm.uid}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e2e2] bg-[#ffffff] px-4 py-3 text-xs"
            >
              <div>
                <p className="font-mono-tabular font-semibold text-[#000000]">{adm.email}</p>
                <p className="font-mono-tabular text-[#5e5e5e]">
                  UID: {adm.uid} · Granted {formatIsoDateTime(adm.grantedAt)}
                </p>
              </div>
              {adm.email.toLowerCase() !== ADMIN_EMAIL ? (
                <button
                  type="button"
                  disabled={busyUid === adm.uid}
                  onClick={() => {
                    void handleRevokeAdmin(adm.uid, adm.email);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#b42318] bg-[#ffffff] px-3.5 py-1.5 text-xs font-medium text-[#b42318]"
                >
                  <ShieldOff size={12} aria-hidden="true" />
                  <span>Revoke Admin</span>
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <form
          onSubmit={handleAddManualAdmin}
          className="pt-4 border-t border-[#e2e2e2] grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-[#000000] mb-1">
              Firebase Auth UID
            </label>
            <input
              type="text"
              required
              value={manualUid}
              onChange={(e) => setManualUid(e.target.value)}
              placeholder="Paste user UID"
              className="w-full rounded-lg bg-[#efefef] px-3 py-2.5 text-xs font-mono-tabular text-[#000000]"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-[#000000] mb-1">Email</label>
            <input
              type="email"
              required
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              placeholder="teammate@browns.co.in"
              className="w-full rounded-lg bg-[#efefef] px-3 py-2.5 text-xs text-[#000000]"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={addingManual}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-4 py-2.5 text-xs font-medium text-[#ffffff]"
            >
              <UserPlus size={13} aria-hidden="true" />
              <span>{addingManual ? 'Granting...' : 'Add Co-Admin'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Registered Users */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-[#000000]">
            Registered Accounts ({users.length})
          </h2>
          <div className="relative w-full sm:w-80">
            <Search
              size={15}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e5e]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, or UID"
              className="w-full rounded-xl border border-[#e2e2e2] bg-[#ffffff] pl-10 pr-4 py-2.5 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
            />
          </div>
        </div>

        {loading && users.length === 0 ? (
          <div className="border border-[#e2e2e2] glass-light rounded-2xl p-10 text-center">
            <p className="text-sm text-[#5e5e5e]">Loading user accounts...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="border border-[#e2e2e2] glass-light rounded-2xl p-10 text-center">
            <p className="text-sm text-[#5e5e5e]">No registered accounts match your search.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const isCoAdmin =
                adminUidSet.has(u.uid) || u.email.toLowerCase() === ADMIN_EMAIL;
              const isBusy = busyUid === u.uid;
              const draftName = editingNames[u.uid] ?? u.displayName;
              const confirmingDelete = confirmDeleteUid === u.uid;

              return (
                <div
                  key={u.uid}
                  className="border border-[#e2e2e2] glass-light rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) =>
                          setEditingNames((prev) => ({ ...prev, [u.uid]: e.target.value }))
                        }
                        aria-label={`Display name for ${u.email}`}
                        className="rounded-lg border border-[#e2e2e2] bg-[#ffffff] px-2.5 py-1.5 text-sm font-semibold text-[#000000]"
                      />
                      {draftName.trim() !== u.displayName ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            void handleSaveName(u);
                          }}
                          className="rounded-full bg-[#000000] px-3 py-1.5 text-xs font-medium text-[#ffffff]"
                        >
                          Save Name
                        </button>
                      ) : null}
                      {isCoAdmin ? (
                        <span className="font-mono-tabular text-[11px] font-semibold uppercase text-[#166534]">
                          Admin
                        </span>
                      ) : null}
                    </div>
                    <p className="font-mono-tabular text-xs text-[#5e5e5e]">
                      {u.email} · {u.provider} · UID: {u.uid}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {u.email.toLowerCase() !== ADMIN_EMAIL ? (
                      isCoAdmin ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            void handleRevokeAdmin(u.uid, u.email);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#b42318] bg-[#ffffff] px-3.5 py-2 text-xs font-medium text-[#b42318]"
                        >
                          <ShieldOff size={12} aria-hidden="true" />
                          <span>Revoke Admin</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            void handleGrantAdmin(u.uid, u.email);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#000000] px-3.5 py-2 text-xs font-medium text-[#ffffff]"
                        >
                          <Shield size={12} aria-hidden="true" />
                          <span>Make Admin</span>
                        </button>
                      )
                    ) : null}

                    {u.uid !== currentUid && u.email.toLowerCase() !== ADMIN_EMAIL ? (
                      !confirmingDelete ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteUid(u.uid)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3 py-2 text-xs font-medium text-[#b42318]"
                        >
                          <Trash2 size={12} aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              void handleDeleteUser(u);
                            }}
                            className="rounded-full bg-[#b42318] px-3 py-2 text-xs font-medium text-[#ffffff]"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUid(null)}
                            className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3 py-2 text-xs font-medium text-[#000000]"
                          >
                            Cancel
                          </button>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
