# Spec: API Endpoints - Remove useCache Parameter

## REMOVED Requirements

### Requirement: /api/anime-list Accepts useCache Parameter

**Status**: REMOVED

**Rationale**: The `/api/anime-list` endpoint accepted a `useCache` query parameter but did not implement any caching logic. The parameter was received and then ignored, making it dead code.

#### Scenario: Endpoint reads useCache query parameter
- **REMOVED**: Previously, endpoint read `req.query.useCache` to check if caching was requested
- **Code Location**: `cycani-proxy/src/server.js` line 761
- **Impact**: Endpoint no longer parses this parameter

#### Scenario: Parameter was intended for future opt-in caching
- **REMOVED**: Comments indicated "useCache parameter can be used for future opt-in caching implementation"
- **Reasoning**: After analysis, caching is not needed for this project's workflow
- **Impact**: Endpoint always returns fresh data (no change in actual behavior)

---

### Requirement: /api/weekly-schedule Accepts useCache Parameter

**Status**: REMOVED

**Rationale**: The `/api/weekly-schedule` endpoint accepted a `useCache` query parameter but did not implement any caching logic. The parameter was received and then ignored.

#### Scenario: Endpoint reads useCache query parameter
- **REMOVED**: Previously, endpoint read `req.query.useCache` to check if caching was requested
- **Code Location**: `cycani-proxy/src/server.js` line 1272
- **Impact**: Endpoint no longer parses this parameter

#### Scenario: Parameter coexisted with refresh parameter
- **REMOVED**: Previously, both `refresh` and `useCache` parameters were accepted
- **Reasoning**: The `refresh` parameter serves a purpose (manual refresh), `useCache` did nothing
- **Impact**: Endpoint still respects `refresh` parameter for manual refresh behavior

---

## MODIFIED Requirements

### Requirement: /api/anime-list Query Parameters

**Change**: Removed `useCache` parameter from documentation

#### Scenario: Client requests anime list without caching
- **Before**: Client could send `useCache=true` or `useCache=false` (both ignored)
- **After**: Client should not send `useCache` parameter
- **Behavior**: No change - endpoint always returns fresh data

---

### Requirement: /api/weekly-schedule Query Parameters

**Change**: Removed `useCache` parameter from documentation

#### Scenario: Client requests weekly schedule without caching
- **Before**: Client could send `useCache=true` or `useCache=false` (both ignored)
- **After**: Client should not send `useCache` parameter
- **Behavior**: No change - endpoint always returns fresh data

---

## Implementation Notes

### Files Modified
- `cycani-proxy/src/server.js`
  - Line 759-761: Removed `useCache` parameter handling from `/api/anime-list`
  - Line 1270-1272: Removed `useCache` parameter handling from `/api/weekly-schedule`

### Code Removed
```javascript
// REMOVED from /api/anime-list:
// Note: useCache parameter can be used for future opt-in caching implementation
// Currently always fetches fresh data to support development workflow
const useCache = req.query.useCache === 'true' || req.query.useCache === '1';

// REMOVED from /api/weekly-schedule:
// Note: useCache parameter can be used for future opt-in caching implementation
// Currently always fetches fresh data to support development workflow
const useCache = req.query.useCache === 'true' || req.query.useCache === '1';
```

### Backward Compatibility
- **Breaking Change**: No - clients can still send `useCache` parameter, it will just be ignored
- **Migration**: Frontend clients should stop sending the parameter (cleaner API)
- **Error Handling**: No errors if parameter is sent (just ignored like before)

### Testing Changes
- API endpoint tests should verify endpoints work without `useCache` parameter
- Tests should verify endpoints still work if `useCache` is sent (ignored)
- No functional behavior changes

---

## Related Changes

- **Frontend UI Spec**: Removes `useCache` parameter generation from API services
- **Documentation**: Removes `useCache` from API endpoint documentation

---

## Historical Context

This parameter was added as part of the `remove-api-caching` proposal with the intent of supporting "future opt-in caching." However:

1. The caching feature was never implemented
2. The project works fine without any caching
3. The parameter served only to confuse developers and mislead users
4. Removing it simplifies the API surface area
