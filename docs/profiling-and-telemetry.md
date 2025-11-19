# Profiling and Telemetry

## Purpose

Collects performance and loading metrics for analysis and optimization.

## Inputs

- Frame times
- Renderer info
- Loading events
- Memory usage

## Outputs

- Performance statistics
- Telemetry data
- Profile reports

## Runtime Budget

- Telemetry overhead: < 0.1ms per frame
- Data storage: ≤ 1MB in memory
- Export time: < 100ms

## Acceptance Criteria

- Frame time tracking is accurate
- 95th percentile calculations are correct
- Loading telemetry captures all events
- Telemetry export works correctly
- Stats.js integration displays correctly

