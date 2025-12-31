# Spec: Frontend UI - Remove Cache Toggle

## REMOVED Requirements

### Requirement: Cache Settings Composable

**Status**: REMOVED

**Rationale**: The `useCacheSettings` composable managed a global cache preference that had no actual effect on application behavior. The backend ignores the `useCache` parameter, making this composable dead code.

#### Scenario: Composable exported cache settings state
- **REMOVED**: Previously, `useCacheSettings()` returned reactive state and helper functions for cache management
- **Impact**: No components should depend on this composable anymore

#### Scenario: Composable persisted settings to localStorage
- **REMOVED**: Previously, cache settings were saved to `cycani_cache_settings` key in localStorage
- **Impact**: Old localStorage entries may persist but are harmless

---

### Requirement: Cache Toggle Component

**Status**: REMOVED

**Rationale**: The `CacheToggle` component provided a UI for controlling a non-existent feature. It displayed a checkbox and warning message but toggling it had no effect on API behavior.

#### Scenario: Component displayed cache toggle checkbox
- **REMOVED**: Previously, `CacheToggle.vue` rendered a checkbox labeled "启用缓存"
- **Impact**: Settings dropdown no longer shows this toggle

#### Scenario: Component showed warning when cache enabled
- **REMOVED**: Previously, a warning "缓存已启用 - 数据可能不是最新的" was displayed when toggle was on
- **Impact**: Users no longer see misleading warnings

---

### Requirement: Navbar Cache Toggle Integration

**Status**: REMOVED

**Rationale**: The navigation bar settings dropdown included a cache toggle menu item. Since the feature doesn't work, this menu item only confused users.

#### Scenario: Settings dropdown included cache toggle
- **REMOVED**: Previously, the settings dropdown (⚙ icon) had a "启用缓存" menu item
- **Impact**: Settings dropdown now only shows server status and dark mode toggle

#### Scenario: Cache toggle showed current state
- **REMOVED**: Previously, the menu item displayed "开启" or "关闭" based on cache setting
- **Impact**: One less menu item in settings dropdown

#### Scenario: Toggle opened/closed settings dropdown
- **REMOVED**: Previously, clicking the cache toggle item opened the settings dropdown
- **Impact**: Settings dropdown still works for remaining menu items

---

### Requirement: API Services Send useCache Parameter

**Status**: REMOVED

**Rationale**: Frontend API services sent a `useCache` parameter to the backend, but the backend accepted this parameter without implementing any caching logic. This was unnecessary parameter pollution.

#### Scenario: anime.service.ts includes useCache parameter
- **REMOVED**: Previously, `fetchAnimeList()` sent `useCache: 'true'` or `'false'` based on global setting
- **Impact**: Anime list API requests are simpler and don't send ignored parameters

#### Scenario: weeklySchedule.service.ts includes useCache parameter
- **REMOVED**: Previously, `fetchWeeklySchedule()` sent `useCache: 'true'` or `'false'` based on global setting
- **Impact**: Weekly schedule API requests are simpler and don't send ignored parameters

#### Scenario: Services import useCacheSettings composable
- **REMOVED**: Previously, both services imported and used `useCacheSettings` to determine parameter value
- **Impact**: Fewer imports and dependencies in API services

---

## MODIFIED Requirements

### Requirement: Settings Dropdown Menu Items

**Change**: Reduced number of menu items

#### Scenario: Settings dropdown displays available options
- **Before**: Settings dropdown had 3 items: cache toggle, server status, dark mode
- **After**: Settings dropdown has 2 items: server status, dark mode
- **Reasoning**: Removed non-functional cache toggle to reduce UI clutter

---

## Implementation Notes

### Files Deleted
- `frontend/src/composables/useCacheSettings.ts` (60 lines)
- `frontend/src/components/common/CacheToggle.vue` (65 lines)

### Files Modified
- `frontend/src/components/layout/AppNavbar.vue` - removed cache toggle menu item
- `frontend/src/services/anime.service.ts` - removed `useCache` parameter
- `frontend/src/services/weeklySchedule.service.ts` - removed `useCache` parameter
- `frontend/src/services/anime.service.test.ts` - removed cache mocks

### Testing Changes
- Unit tests updated to remove `useCacheSettings` mock
- Test expectations updated to not expect `useCache` parameter
- Test count will decrease slightly

### User Impact
- Users with cache toggle set in localStorage will see it disappear (no functional impact since it did nothing)
- Settings dropdown is cleaner with fewer options
- No functionality is lost (the feature never worked)
