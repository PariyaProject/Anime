# Spec: Component System

## ADDED Requirements

### Requirement: Component-Based Architecture

The frontend MUST use a component-based architecture with reusable, self-contained Vue 3 components.

**Rationale**: Components encapsulate UI logic, styling, and markup, making code reusable and easier to maintain.

#### Scenario: Component Structure
**Given** a Vue 3 component in the project
**When** creating or modifying components
**Then** each component MUST:
- Use Single File Component (.vue) format
- Contain `<template>`, `<script>`, and `<style>` sections
- Use Composition API with `<script setup lang="ts">`
- Accept data through props with TypeScript interfaces
- Emit events for parent communication
- Have scoped styles to avoid CSS conflicts

**Example structure**:
```vue
<template>
  <div class="anime-card" @click="handleClick">
    <img :src="anime.cover" :alt="anime.title" />
    <h3>{{ anime.title }}</h3>
  </div>
</template>

<script setup lang="ts">
import type { Anime } from '@/types/anime.types'

interface Props {
  anime: Anime
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [anime: Anime]
}>()

const handleClick = () => {
  emit('select', props.anime)
}
</script>

<style scoped>
.anime-card {
  /* Scoped styles */
}
</style>
```

#### Scenario: AnimeCard Component
**Given** an anime object from the API
**When** rendering the AnimeCard component
**Then** it MUST:
- Accept `anime` prop with `Anime` type
- Display anime cover image with fallback on error
- Show anime title, score, status, and metadata badges
- Emit `select` event when clicked or "选择播放" button clicked
- Emit `details` event when "查看详情" button clicked
- Handle image loading errors gracefully
- Use `loading="lazy"` for images

#### Scenario: VideoPlayer Component
**Given** a video URL and playback configuration
**When** rendering the VideoPlayer component
**Then** it MUST:
- Accept `videoUrl`, `title`, `autoplay`, and `startTime` props
- Initialize Plyr.js video player
- Handle browser autoplay restrictions (muted -> unmuted)
- Emit `ready` event when player is initialized
- Emit `play` event when video starts playing
- Emit `pause` event with current time when paused
- Emit `ended` event when video finishes
- Emit `error` event if video fails to load
- Support seeking to specific time
- Update player when `videoUrl` prop changes reactively
- Clean up player instance on component unmount

#### Scenario: EpisodeList Component
**Given** a list of episodes for an anime
**When** rendering the EpisodeList component
**Then** it MUST:
- Accept `episodes`, `currentEpisode`, and `completedEpisodes` props
- Display episodes in a responsive grid
- Highlight currently playing episode with visual indicator
- Show checkmark (✅) for completed episodes
- Emit `select` event when episode is clicked
- Use virtual scrolling if episode count > 50
- Support keyboard navigation (arrow keys)
- Show episode numbers (S{season}E{episode}) and titles
- Scroll to current episode on mount

#### Scenario: EpisodeItem Component
**Given** a single episode object
**When** rendering the EpisodeItem component
**Then** it MUST:
- Accept `episode` and `status` props (status: 'default' | 'current' | 'completed')
- Display season and episode number
- Display episode title if available
- Show appropriate status icon based on status
- Emit `select` event when clicked
- Apply different styling for current vs completed episodes
- Support keyboard selection

#### Scenario: HistoryCard Component
**Given** a watch history record
**When** rendering the HistoryCard component
**Then** it MUST:
- Accept `record` prop with `WatchRecord` type
- Display anime thumbnail
- Show anime title and episode info
- Display progress bar with percentage
- Show formatted time (watched/total)
- Display "✅ 已完成" or time progress based on completed status
- Emit `resume` event when "继续观看" or "重新播放" clicked
- Apply different styling for completed records

#### Scenario: AnimeFilters Component
**Given** filter controls for the anime list
**When** rendering the AnimeFilters component
**Then** it MUST:
- Accept `filters` prop with current filter values
- Emit `update:filters` event when any filter changes
- Provide search input with debounced updates (500ms delay)
- Provide genre dropdown (所有类型, 原创, 漫画改, 小说改, etc.)
- Provide year dropdown (2020-2025)
- Provide month dropdown (1-12)
- Provide sort dropdown (按最新, 按最热, 按评分)
- Reset page to 1 when filters change
- Show loading indicator during search debounce

#### Scenario: AnimePagination Component
**Given** a paginated list of anime
**When** rendering the AnimePagination component
**Then** it MUST:
- Accept `currentPage`, `totalPages`, and `totalItems` props
- Emit `page-change` event when page is clicked
- Show current page and total pages info
- Display page numbers with centered window around current page
- Show "上一页" button if not on first page
- Show "下一页" button if not on last page
- Disable pagination when `totalPages <= 1`
- Support keyboard navigation (Ctrl+Arrow keys)

#### Scenario: LoadingSpinner Component
**Given** a loading state in the application
**When** rendering the LoadingSpinner component
**Then** it MUST:
- Accept optional `message` prop for custom loading text
- Display Bootstrap-style spinner animation
- Show message below spinner if provided
- Use centered layout
- Be lightweight and fast to render

#### Scenario: ErrorMessage Component
**Given** an error occurs in the application
**When** rendering the ErrorMessage component
**Then** it MUST:
- Accept `message` and `type` props (type: 'error' | 'warning' | 'success')
- Display alert with appropriate color (red, yellow, green)
- Support dismissal with close button
- Auto-dismiss after timeout (configurable, default 5 seconds)
- Support manual dismiss event
- Use Bootstrap alert styling or Element Plus equivalent

#### Scenario: EmptyState Component
**Given** a list with no results
**When** rendering the EmptyState component
**Then** it MUST:
- Accept `message` and `icon` props
- Display centered empty state with icon
- Show helpful message
- Optionally provide action button
- Use consistent styling across the app

### Requirement: Component Communication

Components MUST communicate through props and events following the unidirectional data flow pattern.

**Rationale**: Props down, events up ensures predictable data flow and easier debugging.

#### Scenario: Props Down
**Given** a parent and child component
**When** passing data from parent to child
**Then** the parent MUST:
- Pass data via component props
- Use TypeScript interfaces for prop validation
- Provide default values for optional props
- Validate required props

**And** the child MUST:
- Declare props with `defineProps<Props>()`
- Not mutate props directly
- Emit events to request changes from parent
- Use computed properties for derived state

#### Scenario: Events Up
**Given** a child component with user interactions
**When** communicating actions to parent
**Then** the child MUST:
- Define events with `defineEmits<EventDef>()`
- Emit events with appropriate payload data
- Use descriptive event names (e.g., 'select', 'update', 'change')
- Emit events as close to the action as possible

**And** the parent MUST:
- Listen to events with `@event-name` syntax
- Handle events in methods or computed properties
- Update its own state in response to events
- Not directly access child component state

#### Scenario: Component Composition
**Given** complex UI with multiple components
**When** composing components together
**Then** components MUST:
- Be reusable in different contexts
- Not depend on specific parent components
- Work independently when given proper props
- Provide slots for customization when appropriate
**Example**: AnimeCard can be used in AnimeGrid, ContinueWatching, or HistoryDropdown

### Requirement: Component Styling

Components MUST use scoped styles and follow a consistent styling approach.

**Rationale**: Scoped styles prevent CSS conflicts and make components self-contained.

#### Scenario: Scoped Styles
**Given** a Vue 3 component
**When** styling the component
**Then** it MUST:
- Use `<style scoped>` to isolate component styles
- Follow BEM-like naming convention for classes (component-element-modifier)
- Use CSS custom properties for theming
- Support responsive design with breakpoints
- Not use global styles except in utility classes

#### Scenario: CSS Framework Integration
**Given** the need for UI components
**When** styling components
**Then** the project MUST:
- Use Element Plus for base UI components (buttons, inputs, modals)
- Use Tailwind CSS for custom styling and utility classes
- Remove Bootstrap 5 dependency from old frontend
- Maintain consistent spacing and colors

**Example**:
```vue
<template>
  <el-button type="primary" @click="handleClick">
    选择播放
  </el-button>
</template>

<style scoped>
.anime-card {
  @apply rounded-lg shadow-md hover:shadow-lg transition-shadow;
}
</style>
```

#### Scenario: Dark Mode Support
**Given** the dark mode toggle feature
**When** styling components
**Then** components MUST:
- Use CSS custom properties for colors
- Support dark mode via `.dark-mode` class on root
- Adapt colors based on theme (light vs dark)
- Maintain contrast ratios for accessibility

**Example**:
```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #000000;
}

.dark-mode {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}

.anime-card {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

### Requirement: Component Testing

All components MUST have unit tests to ensure correctness.

**Rationale**: Tests catch regressions and document expected component behavior.

#### Scenario: Component Unit Tests
**Given** a Vue 3 component
**When** writing unit tests
**Then** tests MUST:
- Use Vitest as the test runner
- Use @vue/test-utils for component mounting
- Test props rendering
- Test event emission
- Test user interactions (click, input, etc.)
- Test edge cases (empty data, errors, etc.)
- Achieve > 70% code coverage

**Example test**:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimeCard from '@/components/anime/AnimeCard.vue'

describe('AnimeCard', () => {
  it('renders anime title', () => {
    const wrapper = mount(AnimeCard, {
      props: {
        anime: { id: 1, title: 'Test Anime', cover: 'test.jpg' }
      }
    })
    expect(wrapper.text()).toContain('Test Anime')
  })

  it('emits select event when clicked', async () => {
    const wrapper = mount(AnimeCard, {
      props: {
        anime: { id: 1, title: 'Test', cover: 'test.jpg' }
      }
    })
    await wrapper.find('.anime-card').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0]).toEqual([
      [{ id: 1, title: 'Test', cover: 'test.jpg' }]
    ])
  })
})
```

### Requirement: Component Performance

Components MUST be optimized for performance with large datasets.

**Rationale**: Lists with 100+ anime or 50+ episodes can cause performance issues without optimization.

#### Scenario: Virtual Scrolling
**Given** a list with 50+ episodes or 100+ anime
**When** rendering the list
**Then** components MUST:
- Use virtual scrolling libraries (vue-virtual-scroller)
- Render only visible items in viewport
- Recycle DOM elements for performance
- Maintain scroll position during updates

#### Scenario: Lazy Loading
**Given** images and heavy components
**When** loading the page
**Then** components MUST:
- Use `loading="lazy"` attribute for images
- Lazy load off-screen components
- Use Intersection Observer API for lazy loading
- Show placeholder or skeleton while loading

#### Scenario: Reactivity Optimization
**Given** components with frequent state updates
**When** state changes occur
**Then** components MUST:
- Use `computed` for derived state
- Use `watchEffect` for side effects
- Avoid unnecessary re-renders
- Use `shallowRef` for large objects that don't need deep reactivity
- Debounce expensive computations
