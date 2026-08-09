# Changelog

## [Unreleased] - 2026-08-09

### Added
- **Light/Dark Mode Toggle** (`_layouts/default.html`)
  - Added a Bootstrap 5 theme toggle button in the navbar using Bootstrap Icons (`bi-moon-stars-fill` / `bi-sun-fill`)
  - Theme preference is persisted in `localStorage` and restored on page load
  - Falls back to system `prefers-color-scheme` when no saved preference exists
  - Live-updates when the system theme changes (only when no manual preference is set)
  - Added `#themeToggle` styles in `assets/css/style.scss` for hover, focus, and focus-visible states

- **Interactive Answer Sheet System**
  - `_includes/tracker-sheet.html` — Reusable answer sheet template with:
    - Two-column responsive layout (single column on mobile)
    - Bubble-style radio button answer inputs (A/B/C/D)
    - Score modal with percentage and result classification (Failed / Qualifying / Good / Very Good / Outstanding)
    - Validation modal for incomplete submissions
    - "Show Answers" and "Back to Sheet" buttons
    - Caesar-shifted (+1) answer key obfuscation to hide answers from view-source
  - `assets/js/tracker-sheet.js` — Grading logic with:
    - Answer key decoding at grading time
    - Per-question correct/incorrect status icons (✓/✗)
    - Unanswered question highlighting
    - Reset functionality
  - `_data/keys.yaml`, `_data/keys_HPGE-01.yaml`, `_data/keys_MSTE-01.yaml` — Answer key data files
  - `_posts/2026-08-09-HPGE.markdown` — HPGE Answer Sheet test post
  - `_posts/2026-08-09-MSTE.markdown` — GERTC MSTE (May 2019) Answer Sheet post

- **Blackhole Page Enhancements**
  - `assets/js/blackhole.js` — Generates 100 twinkling stars with randomized positions and animation durations
  - `blackhole.html` — Simplified to use shared stylesheet and external JS

### Changed
- **`assets/css/style.css` → `assets/css/style.scss`**
  - Converted static CSS to SCSS with Jekyll front matter for Sass processing
  - Added SCSS variables for colors, spacing, and font weights
  - Added dark mode overrides for all custom components via `html[data-bs-theme="dark"]`
  - Added theme toggle button styles
  - Added `.error-page` styles for the 404 page
  - Added `.blackhole-page` styles for the blackhole page

- **`_layouts/default.html`**
  - Added Bootstrap Icons CDN link
  - Updated theme script to check `localStorage` before system preference
  - Added theme toggle button and toggle script
  - Theme toggle is placed outside the collapse menu so it's always visible in the navbar (not inside the hamburger menu on small screens)
  - Used `order-lg-2`/`order-lg-3` to keep the toggle on the right side on large screens

- **`404.html`**
  - Removed inline `<style>` block
  - Simplified to use the shared `.error-page` class from the stylesheet
  - Updated link to point to the blackhole page

- **`_config.yml`**
  - Added SASS/SCSS build settings (`sass_dir: _sass`, `style: compressed`)

### Fixed
- **404 error on `style.css`** — Added Jekyll front matter (`---`) to `assets/css/style.scss` so Jekyll processes it with Sass and outputs `style.css` correctly