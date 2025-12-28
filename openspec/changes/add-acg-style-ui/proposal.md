# Change: Add ACG-Style UI and Theater Mode Video Player

## Why

The current frontend UI is plain and lacks the distinctive anime/ACG aesthetic that would appeal to the target audience. Additionally, the video player on the watch page is not centered on screen and has a small initial size, resulting in a suboptimal viewing experience.

## What Changes

- **ACG Visual Style Design**: Implement classic ACG/anime-style UI with:
  - Colorful theme blocks with anime-inspired color palette (pink/purple/cyan gradients)
  - Decorative anime-style elements (stars, sparkles, geometric patterns)
  - Enhanced card hover effects with anime-style animations
  - Rounded corners, soft shadows, and playful typography
  - Dark mode optimized for ACG aesthetics

- **Theater Mode Video Player**: Implement centered theater layout:
  - Video player centered on screen with darkened background
  - Responsive sizing based on viewport dimensions (maximize screen coverage)
  - Maintain 16:9 aspect ratio without content being obscured
  - Immersive viewing experience with minimal distractions

- **Maintain High Interactivity**: Preserve all existing functionality while improving visual presentation

## Impact

- Affected specs:
  - `frontend-ux` - New UI visual style and player layout requirements
- Affected code:
  - `cycani-proxy/frontend/src/views/HomeView.vue` - Homepage UI redesign
  - `cycani-proxy/frontend/src/views/WatchView.vue` - Video player layout redesign
  - `cycani-proxy/frontend/src/components/anime/AnimeCard.vue` - Card style redesign
  - `cycani-proxy/frontend/src/components/layout/AppContainer.vue` - Container adjustments
  - Global CSS/Tailwind configuration for ACG theme colors and styles
