# Changelog

## 0.6.0-beta.1 — 2026-10-13

### Added

- Optional React 19 entry point: `@andreyshpigunov/x/react`. React and React DOM remain optional peers for vanilla consumers.
- React Modal, Sheets, Dropdown, Autocomplete, Slider, LazyImage and ScrollLink; hooks for visibility, pagination, scroll progress, sticky state, hover and media queries.
- Isolated component styles that preserve X variables and visual behavior without a global reset. Modal includes X transitions, configurable effects and a sticky close button.
- TypeScript declarations, React integration documentation and the portable `skills/x-library` AI skill included in the package.
- Packed-package Next.js fixture and Chromium/WebKit checks for SSR, hydration, focus, cleanup, asynchronous races, touch gestures and CSS parity.

### Fixed in vanilla X

- Escape quotes consistently in generated HTML attributes, including modal classes and error keys.
- Ignore stale autocomplete responses after input changes, reset, selection or teardown.
- Restore original slider nodes on destruction and prevent duplicate initialization.
- Preserve modal counters when hiding an inactive window.
- Wait for a shared script load before invoking concurrent callbacks; permit retry after failure.
- Load independent pagination markers concurrently without a global lock dropping requests.

### Release notes

- Existing vanilla entry points and browser bundles remain available. React 18 is not supported by the new adapter.
- React APIs use state and callbacks instead of globally scanning and rewriting React-owned DOM.
- This is a prerelease. Integration in a real next-cms template and manual testing on physical phones remain to be completed.
- GitHub Release creation triggers npm publication. Prerelease versions use the `beta` dist-tag; stable versions use `latest`.
