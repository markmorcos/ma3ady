# public-booking spec delta

## ADDED Requirements

### Requirement: The day strip SHALL surface scarcity through pressure dots

The slot-picker day strip SHALL paint a small status indicator under each day cell that reflects remaining slot count:

- 0 slots → no dot (or 0.45 opacity day cell, non-tappable)
- 1–3 slots → warning pill (background `warningContainer`)
- 4+ slots → neutral dot (background `outlineVariant`)
- Selected day → dot is filled `onPrimary` on the primary-filled pill

Scarcity SHALL be derived from the same data returned by `compute_available_slots`; no separate RPC is required.

#### Scenario: a day with two free slots shows the warning pill
- **GIVEN** a day with exactly two slots free in the current window
- **WHEN** the day strip renders
- **THEN** the cell shows a `warningContainer`-filled pill under the date number

### Requirement: The slot grid SHALL bucket times by part of day

The slot grid SHALL render three sections in this order: Morning (< 12:00), Afternoon (< 17:00), Evening (≥ 17:00). Each section header SHALL carry a tinted icon tile (Morning → `tertiaryContainer`, Afternoon → `primaryContainer`, Evening → `secondaryContainer`), a section title, and a `free/total` counter. Each slot pill SHALL use the section's container tint; taken slots SHALL render as transparent with a 1px `outlineVariant` border, line-through label, 0.55 opacity, and a disabled press behavior.

#### Scenario: a slot grid with three slots in the morning
- **GIVEN** three free morning slots and zero afternoon/evening slots
- **WHEN** the slot grid renders
- **THEN** the Morning section header renders with the `wb_twilight` icon on a `tertiaryContainer` tile
- **AND** the section counter reads "3 / 3"
- **AND** the Afternoon and Evening sections render with their counters showing "0 / 0"

### Requirement: The booking confirmation SHALL render a hero card with countdown

After a successful booking, the confirmation screen SHALL render a primary-container hero card containing: decorative tonal blobs, the animated check, an uppercase "Confirmed" / "مؤكَّد" eyebrow, a Headline-Medium title, and a countdown pill that updates at least once per minute showing the time until `starts_at`.

#### Scenario: countdown updates as time passes
- **GIVEN** a confirmed appointment 90 minutes in the future
- **WHEN** the confirmation screen has been mounted for 60 seconds
- **THEN** the countdown pill reads "in 89 minutes" (or its localized form)

### Requirement: The confirmation SHALL surface a QR share affordance

The confirmation screen SHALL render a tertiary-container share card containing a QR code that encodes the public manage-booking URL (`https://ma3ady.com/manage/{token}`), a Title Medium headline ("Bring a friend"), and supporting copy explaining the share intent.

#### Scenario: the share card renders a real QR
- **GIVEN** a successful booking with a manage token
- **WHEN** the confirmation screen renders
- **THEN** the share card contains an SVG QR encoding the manage URL
- **AND** the manage URL deep-links to the existing `/manage/[token]` route
