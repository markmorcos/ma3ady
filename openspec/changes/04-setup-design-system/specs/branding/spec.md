# branding — Spec Delta

## ADDED Requirements

### Requirement: The brand wordmark SHALL render in the active locale's script

#### Scenario: English locale
- **GIVEN** the app is running in `en`
- **WHEN** `<Logo />` renders
- **THEN** the latin wordmark `ma3ady` is displayed (sourced from `assets/branding/wordmark-en.svg`)

#### Scenario: Arabic locale
- **GIVEN** the app is running in `ar`
- **WHEN** `<Logo />` renders
- **THEN** the arabic wordmark `ميعادي` is displayed (sourced from `assets/branding/wordmark-ar.svg`)

### Requirement: The brand mark (clock-3) SHALL be locale-independent

#### Scenario: rendering the standalone mark
- **GIVEN** any locale
- **WHEN** `<Mark />` renders
- **THEN** the same SVG (`assets/branding/mark.svg`) is shown
- **AND** the mark adopts the current text color via `currentColor`

### Requirement: Color tokens SHALL match `project.md` §1b

#### Scenario: brand color in light theme
- **GIVEN** the app uses the light theme
- **WHEN** `useTheme().colors.brand[500]` is read
- **THEN** the value equals `#0F766E`

#### Scenario: brand color in dark theme
- **GIVEN** the app uses the dark theme
- **WHEN** `useTheme().colors.brand[500]` is read
- **THEN** the value equals `#2DD4BF`

### Requirement: Brand assets SHALL render at the placeholder phase without errors

#### Scenario: placeholder asset present
- **GIVEN** the placeholder SVGs in `assets/branding/`
- **WHEN** any screen renders the logo or mark
- **THEN** no missing-asset warning is logged
- **AND** the rendering does not crash
