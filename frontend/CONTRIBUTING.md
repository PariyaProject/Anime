# Contributing to Cycani-Proxy Frontend

Thank you for your interest in contributing to the Vue.js frontend for this repository!

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Git**

### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Development Workflow

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add TypeScript types for new code
   - Add unit tests for new features
   - Update documentation as needed

3. **Run tests**
   ```bash
   # Unit tests
   npm test

   # Lint
   npm run lint

   # Build
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Convention

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Code Style

### TypeScript
- Use TypeScript for all new code
- Define interfaces for props and data structures
- Avoid `any` type when possible

### Vue Components
- Use `<script setup lang="ts">` syntax
- Prefer Composition API over Options API
- Use composables for reusable logic
- Add proper ARIA labels for accessibility

### CSS
- Use scoped styles in components
- Follow BEM naming for global classes
- Use Tailwind CSS for utility classes

## Testing

### Unit Tests
- Write tests for components, stores, and utilities
- Use Vitest and @vue/test-utils
- Place test files next to source files with `.test.ts` suffix

### E2E Tests
- Write E2E tests for critical user flows
- Use Playwright
- Place E2E tests in `e2e/` directory

## Pull Request Process

1. **Update your branch** with latest changes
   ```bash
   git fetch origin
   git rebase origin/master
   ```

2. **Create Pull Request**
   - Provide a clear description of changes
   - Reference related issues
   - Include screenshots for UI changes

3. **Address review feedback**
   - Make requested changes
   - Push updates to your branch

4. **Merge**
   - After approval, your PR will be merged

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Vue components
│   ├── composables/     # Reusable composition functions
│   ├── stores/          # Pinia stores
│   ├── services/        # API services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── views/           # Page components
├── e2e/                 # E2E tests
└── public/              # Static assets
```

## Getting Help

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: See README.md and docs/

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together!
