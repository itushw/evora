# Evora Firestore Security Specification

## Collections & Access Matrix

1. `/users/{userId}`
   - `get`: Owner only (`request.auth.uid == userId`).
   - `list`: Denied for all users (prevents user directory scraping).
   - `create`: Owner only with valid `uid == userId`, bounded strings, allowed `provider` (`password` or `google`), and strict schema keys.
   - `update`: Owner only; only `displayName`, `provider`, and `updatedAt` may change; `uid`, `email`, and `createdAt` remain immutable.
   - `delete`: Denied.

2. `/events/{eventId}`
   - `read` (`get`, `list`): Public (unauthenticated browsing of campus events).
   - `create`: Authenticated user only; `creatorUid` must equal `request.auth.uid`; category must belong to `['Tech', 'Music', 'Arts', 'College Fests', 'Workshops']`; strict key allow-list and string/array size limits.
   - `update`:
     - Organizer owner (`resource.data.creatorUid == request.auth.uid`) may update mutable event fields while keeping `id`, `slug`, `creatorUid`, and `createdAt` immutable.
     - Authenticated attendee booking/cancellation may update ONLY `tiers` and `updatedAt` with the same tier array size (`request.resource.data.tiers.size() == resource.data.tiers.size()`).
   - `delete`: Organizer owner only (`resource.data.creatorUid == request.auth.uid`).

3. `/orders/{orderId}`
   - `get` and `list`: Owner only (`request.auth.uid == resource.data.userId`). Client list queries must filter `where('userId', '==', auth.currentUser.uid)`.
   - `create`: Authenticated user only; `userId == request.auth.uid`; initial `status` must be `'confirmed'`; `currency == 'INR'`; positive bounded `quantity` (1..10) matching `passes.size()`; strict schema key allow-list.
   - `update`: Owner only; strictly permits transitioning `status` from `'confirmed'` to `'refunded'` with `refundedAt` set (`affectedKeys().hasOnly(['status', 'refundedAt'])`). Terminal lock prevents any update once `status == 'refunded'`.
   - `delete`: Denied (preserves booking audit trail).

4. Catch-All Rule (`/{document=**}`)
   - Default deny (`allow read, write: if false`).
