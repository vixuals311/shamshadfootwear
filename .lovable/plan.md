

## Plan: Logged-In Devices Management

### Overview
Admin can set a max device/session limit per user. Admin can view all active sessions for any user (device info, last active) and remotely terminate them. When a user exceeds their device limit on login, they see their active sessions and must choose one to end before proceeding.

### Database Changes

1. **Add `max_devices` column to `user_roles`** (default 3):
   ```sql
   ALTER TABLE public.user_roles ADD COLUMN max_devices integer NOT NULL DEFAULT 3;
   ```

2. **Update `user_sessions` table** -- already exists with `user_id`, `device_info`, `is_active`, `last_active_at`, `session_token`. Add an `ip_address` column:
   ```sql
   ALTER TABLE public.user_sessions ADD COLUMN ip_address text;
   ```

3. **Add RLS policy** so users can insert/update their own sessions (currently missing insert policy for non-admins).

### Code Changes

#### 1. Login Flow -- Session Registration & Device Limit Check
**File: `src/hooks/useAuth.ts`**
- On `SIGNED_IN` event, upsert a record in `user_sessions` with device info (from `navigator.userAgent`).
- Before creating a new session, count active sessions for the user. If count >= `max_devices`, set a state flag like `deviceLimitReached` with the list of active sessions.

#### 2. Device Limit Exceeded Dialog
**File: `src/pages/Login.tsx`** (or a new component `DeviceLimitDialog.tsx`)
- When `deviceLimitReached` is true, show a dialog listing active sessions (device info, last active time).
- User picks a session to terminate. On confirm, deactivate that session record and proceed with the new login.
- If user cancels, sign them out.

#### 3. Admin: Max Devices Setting per User
**File: `src/pages/UserManagement.tsx`**
- Add a "Max Devices" option to the user action dropdown (similar to "Session Timeout").
- Dialog with a select: 1, 2, 3, 5, or unlimited.
- Updates `user_roles.max_devices` for that user.

#### 4. Admin: View & Manage Active Sessions
**File: `src/pages/UserManagement.tsx`**
- Add "Active Sessions" option to the user action dropdown.
- Opens a dialog showing all active sessions from `user_sessions` for that user (device info, IP, last active, created at).
- Admin can terminate individual sessions or all sessions with a button click (sets `is_active = false`).

#### 5. Keep Sessions Current
**File: `src/hooks/useInactivityTimeout.ts`** or `AppLayout.tsx`
- Periodically update `last_active_at` on the current session (every 5 minutes) so the admin view shows fresh data.
- On sign-out, mark the session as inactive (already done in existing code).

### UI Summary

- **User Management dropdown** gets 2 new items: "Max Devices" and "Active Sessions"
- **Login page** gets a conditional dialog when device limit is exceeded, showing sessions to terminate
- **No new pages** -- all integrated into existing flows

