# Instancing and Batching

## Purpose

Reduces draw calls by batching geometry and using GPU instancing.

## Inputs

- Repeated geometry
- Instance positions/rotations/scales
- Material groups

## Outputs

- Instanced meshes
- Batched geometry groups

## Runtime Budget

- Draw calls: ≤ 100 (target), ≤ 200 (max)
- Batching overhead: < 5ms per batch operation
- Instance updates: < 1ms per frame

## Acceptance Criteria

- Draw calls stay within budget
- Instancing works correctly
- Batching reduces draw calls significantly
- No visual artifacts from batching

