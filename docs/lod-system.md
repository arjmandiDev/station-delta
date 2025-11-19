# LOD System

## Purpose

Manages level-of-detail switching to maintain performance while preserving visual quality.

## Inputs

- Camera position
- Object positions
- LOD distance thresholds

## Outputs

- LOD level recommendations
- Quality upgrade triggers

## Runtime Budget

- LOD calculation: < 1ms per frame
- Update frequency: Every 1 second
- Triangle budget: 30-60k per room, ≤ 100k visible total

## Acceptance Criteria

- LOD switches based on distance correctly
- Low LOD loads instantly on zone entry
- Progressive quality upgrades are smooth
- Triangle counts stay within budget

