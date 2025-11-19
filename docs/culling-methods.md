# Culling Methods

## Purpose

Optimizes rendering by culling invisible objects and zones.

## Inputs

- Camera frustum
- Object bounding boxes
- Portal definitions
- Scene geometry

## Outputs

- Visibility flags
- Culled object lists

## Runtime Budget

- Frustum cull: < 0.5ms per frame
- Portal cull: < 1ms per frame
- Occlusion cull: < 2ms per frame (optional)

## Acceptance Criteria

- Frustum culling works correctly
- Portal culling identifies visible zones
- Occlusion culling reduces overdraw
- Culling doesn't introduce visual artifacts

