# Offline Capture Flow - Diagnostic Guide

## Architecture Overview

The offline capture system has been completely rewritten with a clean separation of concerns:

```
DroneCamera.tsx
    ↓
captureCurrentFrame() → returns dataURL
    ↓
handleAutomaticCapture() → checks isOnline
    ↓
if OFFLINE: onOfflineCapture(dataURL)
if ONLINE: onAnalyze(base64, ...)
    ↓
DronePage.tsx
    ↓
handleOfflineCapture(dataURL)
    ↓
saveOfflineCapture(dataURL, timestamp, GPS)
    ↓
IndexedDB
    ↓
getPendingCaptureCount()
    ↓
React state → UI update
```

## Critical Changes Made

### 1. DroneCamera.tsx - Clean Capture Architecture

**NEW FUNCTION: `captureCurrentFrame()`**
- Single responsibility: capture video frame to data URL
- Returns `string | null`
- Validates video readyState >= 2
- Validates video dimensions > 0
- Creates canvas, draws frame, returns data URL
- Logs every step with `[OFFLINE-DEBUG]`

**NEW FUNCTION: `handleAutomaticCapture()`**
- Called every 10 seconds by auto-loop
- Calls `captureCurrentFrame()`
- Routes to offline OR online path based on `isOnline` prop
- NO LOCKS for offline captures
- NO dependencies on Gemini/Ably for offline

**REMOVED:**
- `captureAndAnalyzeFrame()` - replaced with cleaner architecture
- `isAutoAnalyzingRef` lock for offline - offline never blocks
- Countdown triggering captures - countdown is visual only

**TIMERS:**
- ONE auto-loop interval: fires every 10 seconds
- ONE countdown interval: visual only, counts 10→9→8...→1→10

### 2. lib/offlineCaptures.ts - Simplified Storage

**INTERFACE CHANGE:**
```typescript
// OLD:
interface OfflineCapture {
  imageBase64: string;
  mimeType: string;
  // ...
}

// NEW:
interface OfflineCapture {
  imageDataUrl: string;  // Complete data URL
  capturedAt: string;
  latitude: number | null;
  longitude: number | null;
  status: "pending";
}
```

**KEY FUNCTIONS:**
- `saveOfflineCapture(imageDataUrl, timestamp, lat, lon)` - stores complete data URL
- `getPendingCaptures()` - returns all pending captures
- `getPendingCaptureCount()` - returns count
- `deleteCapture(id)` - deletes after successful send

**LOGGING:**
- `[IDB] Opening database`
- `[IDB] Database opened successfully`
- `[IDB] Saving capture`
- `[IDB] Save successful: <id>`
- `[IDB] Save FAILED: <error>`
- `[IDB] Pending count: <count>`

### 3. DronePage.tsx - New Offline Handler

**NEW CALLBACK: `handleOfflineCapture(imageDataUrl)`**
- Receives complete data URL from DroneCamera
- Validates image data (>1000 bytes)
- Saves to IndexedDB with GPS from `currentGpsRef`
- Immediately updates pending count
- Updates UI status message

**PROPS ADDED TO DroneCamera:**
- `isOnline={isOnline}` - network status
- `onOfflineCapture={handleOfflineCapture}` - offline callback

**UI FIX:**
- Show "Send Pending Captures" whenever `pendingCaptureCount > 0`
- No longer requires `isOnline` check for button visibility

## Diagnostic Stages

### Stage A: Camera Capture

**What to look for in console:**
```
[OFFLINE-DEBUG] ===AUTO-LOOP TIMER FIRED===
[OFFLINE-DEBUG] About to call captureCurrentFrame()
[OFFLINE-DEBUG] video.readyState = 4
[OFFLINE-DEBUG] videoWidth = 1280
[OFFLINE-DEBUG] videoHeight = 720
[OFFLINE-DEBUG] Drawing video frame to canvas: 1280x720
[OFFLINE-DEBUG] dataUrl length = 123456
[OFFLINE-DEBUG] Frame captured successfully: 123456 bytes
```

**If this doesn't appear:**
- Auto-loop interval never started
- Check camera startup logs
- Verify `autoLoopIntervalRef` is set

### Stage B: Callback Routing

**What to look for in console:**
```
[OFFLINE-DEBUG] ===AUTOMATIC CAPTURE TRIGGERED===
[OFFLINE-DEBUG] isOnline = false
[OFFLINE-DEBUG] OFFLINE PATH - calling onOfflineCapture
[OFFLINE-DEBUG] onOfflineCapture returned successfully
```

**If callback doesn't fire:**
- `onOfflineCapture` prop not passed to DroneCamera
- Check DronePage props

### Stage C: IndexedDB Save

**What to look for in console:**
```
[OFFLINE-DIRECT] ===Received frame from DroneCamera===
[OFFLINE-DIRECT] Image length = 123456
[OFFLINE-DIRECT] Saving frame to IndexedDB...
[IDB] saveOfflineCapture called
[IDB] imageDataUrl length = 123456
[IDB] Opening database for save...
[IDB] Database opened successfully
[IDB] Creating capture record with id: capture-1234567890-abc123
[IDB] Starting transaction...
[IDB] Adding capture to store...
[IDB] Save successful: capture-1234567890-abc123
[OFFLINE-DIRECT] Saved: capture-1234567890-abc123
```

**If save fails:**
- Check for `[IDB] Save FAILED:` error message
- Verify IndexedDB is supported in browser
- Check if storage quota exceeded

### Stage D: Pending Count & UI

**What to look for in console:**
```
[OFFLINE-DIRECT] Fetching new pending count...
[IDB] getPendingCaptures called
[IDB] Found 1 pending captures
[IDB] Pending count: 1
[OFFLINE-DIRECT] Pending count: 1
```

**What to see in UI:**
```
🔴 OFFLINE MODE
No Internet Connection
1 capture stored locally
```

**After 10 more seconds:**
```
🔴 OFFLINE MODE
No Internet Connection
2 captures stored locally
```

**If count stays at 0:**
- IndexedDB read is failing
- Check `[IDB] Found X pending captures` log
- Verify captures are actually being saved

**If count > 0 but UI doesn't update:**
- `setPendingCaptureCount()` not being called
- React state not triggering re-render

## Testing Checklist

### Test 1: Camera Fires Every 10 Seconds
- [ ] Start camera while offline
- [ ] Wait 10 seconds
- [ ] See `[OFFLINE-DEBUG] ===AUTO-LOOP TIMER FIRED===`
- [ ] Wait another 10 seconds
- [ ] See timer fire again

### Test 2: Frame Capture Works
- [ ] See `[OFFLINE-DEBUG] Frame captured successfully`
- [ ] See data URL length > 100000 bytes
- [ ] No "Video dimensions are zero" errors

### Test 3: Callback Fires
- [ ] See `[OFFLINE-DEBUG] OFFLINE PATH - calling onOfflineCapture`
- [ ] See `[OFFLINE-DIRECT] ===Received frame from DroneCamera===`
- [ ] See image length matches captured frame

### Test 4: IndexedDB Save Works
- [ ] See `[IDB] Save successful: capture-...`
- [ ] NO `[IDB] Save FAILED` errors
- [ ] Transaction completes successfully

### Test 5: Pending Count Updates
- [ ] After first capture: see `Pending count: 1`
- [ ] UI shows "1 capture stored locally"
- [ ] After second capture: see `Pending count: 2`
- [ ] UI shows "2 captures stored locally"

### Test 6: Send Button Appears
- [ ] Turn internet back ON
- [ ] UI immediately shows "📤 Send Pending Captures"
- [ ] Button is clickable (not disabled)

### Test 7: Manual Send Works
- [ ] Click "Send Pending Captures"
- [ ] See `[SEND] Pending captures found: X`
- [ ] See `[SEND] Gemini success` for each
- [ ] See `[SEND] Ably publish success` for each
- [ ] See pending count decrease to 0

## Common Issues

### Issue: "AUTO-LOOP TIMER FIRED" never appears
**Cause:** Interval not starting
**Fix:** Check camera startup sequence, verify `autoLoopIntervalRef` assignment

### Issue: Timer fires but "Frame captured successfully" never appears
**Cause:** Video not ready or dimensions zero
**Fix:** Wait longer for video to initialize, check video element state

### Issue: "onOfflineCapture returned successfully" but no IndexedDB log
**Cause:** Callback not connected or failing silently
**Fix:** Check DronePage prop connection, verify callback is defined

### Issue: "[IDB] Save FAILED" error
**Cause:** IndexedDB transaction error
**Fix:** Check browser IndexedDB support, storage quota, transaction logs

### Issue: Save succeeds but count stays 0
**Cause:** IndexedDB read failing or wrong store/index
**Fix:** Verify store name matches, check index on "status" field

### Issue: Count > 0 but UI shows 0
**Cause:** React state not updating
**Fix:** Verify `setPendingCaptureCount()` is called, check React dev tools

## Expected Console Output (Normal Flow)

**Initial:**
```
[IDB] Opening database...
[IDB] Database opened successfully
[IDB] getPendingCaptures called
[IDB] Found 0 pending captures
[OFFLINE-DIRECT] Initial pending count: 0
```

**Every 10 seconds while offline:**
```
[OFFLINE-DEBUG] ===AUTO-LOOP TIMER FIRED===
[OFFLINE-DEBUG] ===AUTOMATIC CAPTURE TRIGGERED===
[OFFLINE-DEBUG] isOnline = false
[OFFLINE-DEBUG] video.readyState = 4
[OFFLINE-DEBUG] videoWidth = 1280
[OFFLINE-DEBUG] videoHeight = 720
[OFFLINE-DEBUG] Drawing video frame to canvas: 1280x720
[OFFLINE-DEBUG] dataUrl length = 156784
[OFFLINE-DEBUG] Frame captured successfully: 156784 bytes
[OFFLINE-DEBUG] OFFLINE PATH - calling onOfflineCapture
[OFFLINE-DIRECT] ===Received frame from DroneCamera===
[OFFLINE-DIRECT] Image length = 156784
[OFFLINE-DIRECT] Saving frame to IndexedDB...
[IDB] saveOfflineCapture called
[IDB] imageDataUrl length = 156784
[IDB] Opening database for save...
[IDB] Database opened successfully
[IDB] Creating capture record with id: capture-1735612345678-xyz789
[IDB] Starting transaction...
[IDB] Adding capture to store...
[IDB] Save successful: capture-1735612345678-xyz789
[IDB] Transaction completed for capture-1735612345678-xyz789
[OFFLINE-DIRECT] Saved: capture-1735612345678-xyz789
[OFFLINE-DIRECT] Fetching new pending count...
[IDB] getPendingCaptures called
[IDB] Found 1 pending captures
[IDB] Pending count: 1
[OFFLINE-DIRECT] Pending count: 1
[OFFLINE-DEBUG] onOfflineCapture returned successfully
```

## Build Result
✅ TypeScript build successful
✅ Zero errors
✅ All routes compiled
