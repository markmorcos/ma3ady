# admin spec delta

## ADDED Requirements

### Requirement: The admin Today screen SHALL render a vertical timeline with a "Now" indicator

The admin Today screen SHALL render today's appointments as a vertical timeline with a 2dp vertical rule on the leading edge and a 10dp dot per appointment. The dot whose `starts_at..ends_at` window contains the current time SHALL render as a primary-filled glowing pulse (4dp opacity-30 ring), and its accompanying row SHALL render as a primary-container card with a 2dp primary border and a "Now" chip in place of the status badge.

#### Scenario: the current appointment is highlighted
- **GIVEN** today's schedule contains an appointment whose `starts_at..ends_at` brackets `now()`
- **WHEN** the admin Today screen renders
- **THEN** that appointment's row uses a primary-container background and a 2dp primary border
- **AND** the row's trailing area shows a "Now" chip instead of the status badge

### Requirement: The admin Hours screen SHALL render a weekly heatmap

The admin Hours screen SHALL replace the per-day card list with a 30-row × 7-column heatmap covering Monday → Sunday and 7:00 → 22:00 in 30-minute steps. Cells SHALL paint by state:

- Open (intersects an availability rule) → `primary` fill; the first and last cells of a contiguous band carry `borderTopLeftRadius`/`borderTopRightRadius` and `borderBottomLeftRadius`/`borderBottomRightRadius` of 6dp respectively, so contiguous cells read as one capsule.
- Closed → `surfaceContainerHighest` fill.
- Block exception → `errorContainer` fill with a 45° stripe overlay at 60% `error` opacity.
- Extra hours exception → `successContainer` fill with a 45° stripe overlay at 60% `success` opacity.

A legend SHALL appear below the grid showing each of the four states with a 16dp swatch.

#### Scenario: a Tuesday 09:00–17:00 rule paints a continuous band
- **GIVEN** a tenant with one availability rule on Tuesday 09:00–17:00
- **WHEN** the Hours screen renders
- **THEN** the cells from (Tue, 09:00) through (Tue, 16:30) all paint primary
- **AND** the (Tue, 09:00) cell has a 6dp top border radius and the (Tue, 16:30) cell has a 6dp bottom border radius

### Requirement: The Hours heatmap SHALL support drag-painting a band

The admin SHALL be able to drag across cells within a single day column to paint a new availability band; releasing the gesture SHALL commit the new band by calling `bulkReplaceRulesForDay` with the merged set of bands for that day. A single tap on a cell SHALL toggle that 30-minute slot. A long-press on a band SHALL open the existing exception editor seeded with the band's start and end times.

#### Scenario: dragging from 09:00 to 11:00 commits a 2-hour band
- **GIVEN** an empty Tuesday column
- **WHEN** the admin drags from (Tue, 09:00) to (Tue, 11:00) and releases
- **THEN** `bulkReplaceRulesForDay` is called with `day_of_week = 2` and bands containing `{ start_time: '09:00:00', end_time: '11:30:00' }`
