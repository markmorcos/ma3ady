# branding Specification

## Purpose
TBD - created by archiving change setup-design-system. Update Purpose after archive.
## Requirements
### Requirement: The brand wordmark SHALL render in the active locale's script

The `<Logo />` component SHALL pick `assets/branding/wordmark-en.svg` when `i18next.language === 'en'` and `wordmark-ar.svg` when `'ar'`, so the wordmark MUST switch script with the active locale.

#### Scenario: English locale
- **GIVEN** the app is running in `en`
- **WHEN** `<Logo />` renders
- **THEN** the latin wordmark `ma3ady` is displayed (sourced from `assets/branding/wordmark-en.svg`)

#### Scenario: Arabic locale
- **GIVEN** the app is running in `ar`
- **WHEN** `<Logo />` renders
- **THEN** the arabic wordmark `ميعادي` is displayed (sourced from `assets/branding/wordmark-ar.svg`)

### Requirement: The brand mark (clock-3) SHALL be locale-independent

The `<Mark />` component SHALL render the same `assets/branding/mark.svg` regardless of locale and MUST adopt the active text color via `currentColor`.

#### Scenario: rendering the standalone mark
- **GIVEN** any locale
- **WHEN** `<Mark />` renders
- **THEN** the same SVG (`assets/branding/mark.svg`) is shown
- **AND** the mark adopts the current text color via `currentColor`

### Requirement: Color tokens SHALL match `project.md` §1b

The theme tokens SHALL match the `project.md` §1b table exactly — light `brand.500 = #0F766E`, dark `brand.500 = #2DD4BF`, etc. — and any divergence MUST surface as a token-snapshot test failure.

#### Scenario: brand color in light theme
- **GIVEN** the app uses the light theme
- **WHEN** `useTheme().colors.brand[500]` is read
- **THEN** the value equals `#0F766E`

#### Scenario: brand color in dark theme
- **GIVEN** the app uses the dark theme
- **WHEN** `useTheme().colors.brand[500]` is read
- **THEN** the value equals `#2DD4BF`

### Requirement: Brand assets SHALL render at the placeholder phase without errors

Placeholder SVGs in `assets/branding/` SHALL be valid renderable assets so any screen using `<Logo />` or `<Mark />` MUST mount without missing-asset warnings before the final designer-produced files land.

#### Scenario: placeholder asset present
- **GIVEN** the placeholder SVGs in `assets/branding/`
- **WHEN** any screen renders the logo or mark
- **THEN** no missing-asset warning is logged
- **AND** the rendering does not crash

