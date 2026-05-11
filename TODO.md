nedi7# Fix Recognition Timeout - "recognition took too long"

## Plan Progress

### Phase 1: Extend Timeouts + UI Feedback
- [x] Create TODO.md ✅
- [x] Edit kiosk-app/src/hooks/useScanner.js (timeouts + states) ✅
### Phase 1: Extend Timeouts + UI Feedback
- [x] Phase 1 test [PENDING USER]
- [x] Remote timeout → 35s + local similarity optimized (50 employees max, 3 embeddings/employee)
- [x] Backend GPU acceleration (InsightFace CUDA first)
- [x] Create TODO.md ✅
- [x] Edit kiosk-app/src/hooks/useScanner.js (timeouts + states) ✅
- [x] Edit kiosk-app/src/services/recognitionService.js + api.js (remote timeout) ✅
- [x] Phase 1 test [PENDING USER]
- [x] Remote timeout → 35s + local similarity optimized (50 employees max, 3 embeddings/employee)

### Testing
- [ ] Physical device (slow cases)
- [ ] Many employees
- [ ] Network fallback

**Status**: Starting Phase 1 edits
