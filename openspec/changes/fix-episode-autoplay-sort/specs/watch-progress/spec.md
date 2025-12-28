# Spec: Watch Progress

## MODIFIED Requirements

### Requirement: Episode numbers must be numeric for navigation

The frontend MUST ensure that episode numbers are stored as numbers, not strings, to enable correct numeric operations.

#### Scenario: Episode number type conversion

**Given** the backend API returns `data.episode` as a string (e.g., "1")
**When** the frontend assigns this to `episode.value`
**Then** it MUST convert to a number: `episode.value = Number(data.episode)`

#### Scenario: Next episode calculation

**Given** current episode is 1 (number)
**When** `playNext()` is called
**Then** `episode.value + 1` MUST equal 2 (numeric addition), not "11" (string concatenation)

#### Scenario: Double-digit episode navigation

**Given** current episode is 11 (number)
**When** `playNext()` is called
**Then** `episode.value + 1` MUST equal 12 (numeric addition), not "111" (string concatenation)

## ADDED Requirements

### Requirement: Route query parameter type consistency

When watching route query parameters, the frontend MUST convert string values to numbers before assigning to refs.

#### Scenario: Route change maintains numeric types

**Given** the route query contains `episode: "1"` (string)
**When** the route watcher triggers
**Then** `episode.value` MUST be assigned as `Number(route.query.episode) || 1`
