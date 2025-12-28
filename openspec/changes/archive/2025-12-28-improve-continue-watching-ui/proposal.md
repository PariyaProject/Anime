# Change: Improve Continue Watching UI and Weekly Schedule UX

## Why

The current frontend has three usability issues that impact the user experience:

1. **Continue Watching displays episodes individually**: Users see multiple cards for the same anime (one per episode watched), which is cluttered and inefficient. Users want to see their progress grouped by anime with quick access to all watched episodes.

2. **Navigation Continue Watching dropdown inconsistency**: The dropdown in the navbar may not be properly loading or displaying the same content as the homepage Continue Watching section, causing confusion.

3. **Weekly Schedule defaults to "All"**: The weekly schedule component defaults to showing all days instead of the current day, requiring users to manually click to see today's updates.

## What Changes

### 1. Group Continue Watching by Anime
- Transform the flat episode-based list into a grouped anime-based display
- Each anime card shows:
  - Anime cover and title
  - Total episodes watched count
  - Latest watched episode with quick resume
  - Expandable episode list with individual episode progress
  - Jump to any watched episode

### 2. Fix Navigation Continue Watching Dropdown
- Ensure the navbar dropdown loads and displays the same data as the homepage
- Display grouped anime format (consistent with homepage)
- Show up to 5 recently watched anime with quick episode access

### 3. Auto-Select Current Day in Weekly Schedule
- Detect current day of week on component mount
- Automatically select and display today's anime schedule
- Keep "All" option available for users who want to see the full week

## Impact

- **Affected specs**:
  - New spec: `frontend-ux` (Frontend User Experience requirements)

- **Affected code**:
  - `frontend/src/views/HomeView.vue` - Continue Watching section
  - `frontend/src/views/HistoryView.vue` - History page
  - `frontend/src/components/layout/AppNavbar.vue` - Navigation dropdown
  - `frontend/src/components/schedule/WeeklySchedule.vue` - Weekly schedule component
  - `frontend/src/stores/history.ts` - History store (may need grouping logic)
  - `frontend/src/components/history/` - New components for grouped display

## Breaking Changes

None. This is a UI/UX improvement that maintains backward compatibility with existing data structures.
