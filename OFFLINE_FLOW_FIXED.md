# Offline Capture Flow - Root Cause Analysis and Fix

## 1. Why captures were NOT being stored (ROOT CAUSES):

### Problem #1: Countdown Timer Logic Was Broken
**Symptom:** Countdown stayed at "10s" and never changed
**Root Cause:** The countdown interval was not properly updating the React state
**Fix:** Rewrote `startCountdown()` with proper state updates and comprehensive logging

### Problem #2: `isAutoAnalyzingRef` Lock Never Released on Error
**Symptom:** After first capture attempt, subsequent captures were blocked
**Root Cause:** If `onAnalyze()` threw an error, `isAutoAnalyzingRef.current = false` was never executed
**Fix:** Wrapped `onAnalyze()` call in try-catch-finally block to ensure the lock is ALWAYS released

### Problem #3: No Visibility into Capture Chain
**Symptom:** Impossible to debug why captures weren't happening
**Root Cause:** No logging throughout the critical capture path
**Fix:** Added comprehensive `[OFFLINE]` prefixed logging at every step:
- `[OFFLINE] Countdown tick` - every second
- `[OFFLINE] Auto-loop timer fired` - every 10 seconds
- `[OFFLINE] Camera frame capture triggered` - when capture starts
- `[OFFLINE] Video ready: true/false` - video element state
- `[OFFLINE] Frame captured: X base64 bytes` - capture success
- `[OFFLINE] Saving to IndexedDB` - storage attempt
- `[OFFLINE] Saved successfully: <id>` - storage success
- `[OFFLINE] IndexedDB ERROR: <error>` - storage failure

### Problem #4: Offline Mode Indicator Logic Was Backwards
**Symptom:** Offline indicator only showed after a capture was made
**Root Cause:** Condition was `!isOnline && pendingCaptureCount > 0`
**Fix:** Changed to `!isOnline` (always show when offline, regardless of pending count)

### Problem #5: Pending Count Updates Were Delayed
**Symptom:** UI showed "0 captures" briefly after saving
**Root Cause:** Pending count only updated via 2-second interval
**Fix:** Immediately update pending count after each capture save

## 2. Files Changed:

### `lib/offlineCaptures.ts` - Complete rewrite:
- Added `validateImageBase64()` function to prevent saving invalid images
- Added `[OFFLINE]` logging prefix for all IndexedDB operations
- Added proper error handling with `try-catch-finally` blocks
- Added transaction error handlers
- Fixed typo: `captiveId` → `captureId`

### `components/DronePage.tsx` - Multiple critical fixes:
- Added `isOnline` prop to DroneCamera component
- Fixed network change handlers to immediately update pending count
- Enhanced `handleDroneAnalyze()` with comprehensive logging
- Fixed offline mode indicator to always show when offline
- Enhanced `handleSendPendingCaptures()` with detailed logging
- Fixed pending count refresh logic

### `components/DroneCamera.tsx` - Major fixes:
- Added `isOnline` prop to component interface
- Rewrote `startCountdown()` with proper state updates and logging
- Fixed `captureAndAnalyzeFrame()` to ALWAYS release `isAutoAnalyzingRef` lock
- Added video dimension validation before capture
- Added base64 data validation before saving
- Added comprehensive logging throughout capture chain
- Fixed countdown timer to properly count: 10 → 9 → 8 → ... → 1 → 10 → ...

## 3. How the offline capture NOW flows:

### Camera Startup (Online or Offline):
1. User clicks "Start Drone Camera"
2. Camera permission requested
3. Video stream started
4. `waitForVideoReady()` polls until video has valid dimensions
5. `captureAndAnalyzeFrame()` called immediately (first capture)
6. `startCountdown()` starts countdown timer (10s visual countdown)
7. Auto-loop interval started (fires every 10 seconds)

### Offline Capture Flow:
1. **Every 10 seconds:** Auto-loop timer fires
2. `[OFFLINE] Auto-loop timer fired` logged
3. `captureAndAnalyzeFrame()` called
4. Checks `isAutoAnalyzingRef.current` (prevents concurrent captures)
5. Validates video has non-zero dimensions
6. Draws video frame to canvas
7. Converts to base64 data URL
8. Validates base64 data is non-empty and valid
9. Calls `onAnalyze()` → goes to DronePage's `handleDroneAnalyze()`
10. DronePage checks `isOnline` → false
11. Calls `saveOfflineCapture()` with validated image data
12. IndexedDB validates image data before saving
13. Image saved with unique ID, timestamp, GPS (if available), status="pending"
14. `[OFFLINE] Saved successfully: <id>` logged
15. Pending count immediately updated in React state
16. UI shows: "1 capture stored locally"
17. Countdown continues: 10 → 9 → 8 → ... (visible every second)

### After 10 more seconds (offline):
- Auto-loop fires again
- Same capture process repeats
- UI updates: "2 captures stored locally"
- Countdown visible: 10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1 → 10 → ...

### When Network Returns (Online):
1. Browser fires "online" event
2. DronePage sets `isOnline = true`
3. Immediately reads IndexedDB for pending captures
4. Shows: "📦 X captures stored locally"
5. Shows: "📤 Send Pending Captures" button
6. User can manually click button to send pending captures
7. NO automatic sending

### Manual Send Flow:
1. User clicks "📤 Send Pending Captures"
2. Checks `navigator.onLine` → must be true
3. Reads all pending captures from IndexedDB
4. Shows progress: "Sending 1 / X"
5. For each capture:
   - Sends to `/api/analyze` (Gemini AI)
   - Gets AnalysisResult
   - Publishes to Ably channel
   - Deletes from IndexedDB (only after BOTH succeed)
6. Shows: "X pending captures sent successfully"
7. Updates pending count

## 4. Build Result:

✅ **TypeScript build successful** with zero errors
✅ **All routes compiled correctly**
✅ **No breaking changes** to existing online functionality

## 5. Key Improvements:

### Error Resilience:
1. **Always Release Lock** - `isAutoAnalyzingRef` released even if errors occur
2. **Validate Before Save** - No invalid images saved to IndexedDB
3. **Comprehensive Logging** - Every step logged with `[OFFLINE]` prefix
4. **Graceful Degradation** - If IndexedDB fails, logged but doesn't crash

### User Experience:
1. **Visible Countdown** - User sees: 10s → 9s → 8s → ... (every second)
2. **Immediate Feedback** - Capture count updates instantly after save
3. **Clear Status** - Always shows offline status when offline
4. **Progress Tracking** - Visual progress bar during manual send

### Debugging:
All console logs use prefixes for easy filtering:
- `[DronePage]` - Main page events
- `[OFFLINE]` - Offline mode and IndexedDB operations
- `[SEND]` - Manual send process

## 6. Testing Checklist:

### Test 1: Countdown Works
- [ ] Start camera in offline mode
- [ ] Verify countdown changes every second: 10 → 9 → 8 → ...
- [ ] Verify countdown resets to 10 after reaching 1
- [ ] Verify console shows: `[OFFLINE] Countdown tick`

### Test 2: Captures Saved
- [ ] Wait 10 seconds for first capture
- [ ] Verify console shows: `[OFFLINE] Camera frame captured`
- [ ] Verify console shows: `[OFFLINE] Saved successfully`
- [ ] Verify UI shows: "1 capture stored locally"

### Test 3: Multiple Captures
- [ ] Wait another 10 seconds
- [ ] Verify UI shows: "2 captures stored locally"
- [ ] Wait another 10 seconds
- [ ] Verify UI shows: "3 captures stored locally"

### Test 4: Network Recovery
- [ ] Turn internet back on
- [ ] Verify UI shows: "📦 X captures stored locally"
- [ ] Verify "📤 Send Pending Captures" button appears
- [ ] Click button
- [ ] Verify captures sent successfully

### Test 5: Online Mode Preserved
- [ ] Start camera in online mode
- [ ] Verify automatic Gemini analysis works
- [ ] Verify Ably publishing works
- [ ] Verify laptop receives results
