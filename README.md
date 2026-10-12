# X

Small and simple Javascript library with interesting features.

## Modules

- Animate
- Appear
- Device
- Form
- Hover
- Lazyload
- Lib
- Loadmore
- Modal
- Scroll
- Sheets
- Slider
- Sticky

And several CSS styles for fast prototyping or usage as base styles.

[View details](https://andreyshpigunov.github.io/x/)

# Build

## Building project
```npm run build```

## Publishing on NPM with CI/CD
- update version in package.json
- commit and push changes
- on GitHub create release
- creating release trigger CI/CD publishing process

## Install from NPM
```npm i @andreyshpigunov/x@version```

## Docs

## React (local preview)

The optional `@andreyshpigunov/x/react` entry provides `Modal`, `Sheets`, `Dropdown`,
`Autocomplete`, `Slider`, image/scroll components and lifecycle-safe hooks for React 19. Existing vanilla APIs and browser bundles remain available.
This entry is a local preview and has not been published to npm.

See [React setup, API and local testing](docs/react.md).

```sh
npm test
npm run test:react
npm run dev:react
```

## AI skill

The [x-library skill](skills/x-library/SKILL.md) covers React 19, vanilla X,
CSS customization and optional integration into next-cms or existing markup.
The skill folder is included in the package and can be copied into your agent's skills directory. It does not install X or publish a release.
