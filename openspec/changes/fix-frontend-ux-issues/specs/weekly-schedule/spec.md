# Spec: Weekly Schedule Display

## ADDED Requirements

### Requirement: Weekly Schedule Component

A weekly schedule section MUST be displayed on the homepage showing anime organized by broadcast day, allowing users to discover new and ongoing series.

#### Scenario: Display weekly schedule on homepage

**Given** the user navigates to the homepage
**When** the page loads
**Then** a "每周更新" (Weekly Updates) section should be displayed
**And** anime should be organized by day of the week (Monday through Sunday)
**And** each anime entry should display: title, cover image, rating, and broadcast time

#### Scenario: Fetch weekly schedule data from API

**Given** the weekly schedule component is mounted
**When** the component initializes
**Then** a request should be made to `GET /api/weekly-schedule?day=all`
**And** the response data should be cached for the session
**And** loading state should be shown while fetching

#### Scenario: Handle empty weekly schedule data

**Given** the weekly schedule API returns empty results
**When** the response is received
**Then** an empty state message should be displayed
**And** the section should still be visible (not hidden) for future updates
**And** no error should be thrown that breaks page rendering

#### Scenario: Click anime from weekly schedule

**Given** the weekly schedule is displayed
**When** the user clicks on an anime item
**Then** the user should be navigated to the watch page for that anime
**And** the route should include the animeId parameter

### Requirement: Weekly Schedule TypeScript Types

TypeScript types MUST be defined for weekly schedule data structures.

#### Scenario: Type safety for schedule data

**Given** the `anime.service.ts` fetches weekly schedule data
**When** the response is received
**Then** the data should conform to `WeeklyScheduleResponse` interface
**And** each schedule item should conform to `AnimeScheduleItem` interface
**And** the day field should be a union type of weekday names

### Requirement: Weekly Schedule API Service

A service method MUST be added to fetch weekly schedule data from the backend.

#### Scenario: Service method fetches schedule

**Given** the `animeService` is imported
**When** `animeService.getWeeklySchedule('all')` is called
**When** `animeService.getWeeklySchedule('monday')` is called with specific day
**Then** a request should be made to `/api/weekly-schedule?day=monday`
**And** the response should be typed as `WeeklyScheduleResponse`

## Implementation Notes

- Create `WeeklySchedule.vue` component in `frontend/src/components/schedule/`
- Add `getWeeklySchedule(day?: string)` method to `anime.service.ts`
- Define `AnimeScheduleItem` and `WeeklyScheduleResponse` types in `types/anime.types.ts`
- Integrate component into `HomeView.vue` between "Continue Watching" and "Filters" sections
- Use day-based tabs or collapsible sections for organizing by weekday
- Backend API already exists at `server.js:866-917` with 24-hour cache
