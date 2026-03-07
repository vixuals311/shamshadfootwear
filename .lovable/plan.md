

# Fix: "TypeError: Failed to fetch" When Offline in Recovery Page

## Problem

`navigator.onLine` is unreliable — it can return `true` when connected to WiFi but without actual internet (common on Android/PWA). This causes the code to enter the "online" branch, attempt Supabase calls, and crash with "TypeError: Failed to fetch".

This affects three functions in `Recovery.tsx`:
1. **`fetchData`** — already has a catch fallback to cache (good), but the error toast still fires in some paths
2. **`loadCityClientsForDate`** — shows error toast on network failure instead of falling back to cache
3. **`handleAddRecovery`** — enters online branch, fails on Supabase call, and the catch block only suppresses the error if `navigator.onLine` is false (but it's `true`)

## Solution

**Stop relying on `navigator.onLine` as a gate.** Instead, use a **try-online-first, catch-and-fallback** pattern everywhere:

### 1. `handleAddRecovery` (lines 563-758)
- Remove the `if (navigator.onLine)` / `else` split
- Always try the Supabase call first in a try/catch
- On any network error ("Failed to fetch", "NetworkError", "TypeError"), fall through to the offline queue logic
- Remove the catch block's `navigator.onLine` check — always treat network errors as "go offline"

### 2. `loadCityClientsForDate` (lines 356-436)
- Same pattern: try Supabase first, catch network errors and fall back to cached client data
- Remove the `navigator.onLine` gate

### 3. `fetchData` (lines 151-276)
- Already mostly correct (has cache fallback in catch), but remove the `navigator.onLine` gate so it always tries network first and falls back gracefully

### 4. Create a helper utility
Add a small helper to detect network errors:
```typescript
function isNetworkError(error: any): boolean {
  const msg = error?.message || '';
  return msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('TypeError');
}
```

This ensures the app works correctly regardless of what `navigator.onLine` reports.

