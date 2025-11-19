# Loaders

## Purpose

Custom loaders for optimized asset loading with progress tracking and cancellation support.

## Inputs

- Asset URLs
- Load options (LOD level, progress callbacks)
- Abort signals for cancellation

## Outputs

- Loaded Three.js objects
- Progress events
- Error handling

## Runtime Budget

- GLTF load: Varies by size, streaming supported
- Texture load: < 100ms per texture
- Cancellation: Immediate

## Acceptance Criteria

- Loaders support cancellation
- Progress is accurately reported
- Errors are handled gracefully
- KTX2 transcoder initializes correctly

