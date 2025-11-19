# Assets and Compression

## Purpose

Manages asset loading, compression, and optimization to minimize download size and maximize performance.

## Inputs

- Asset URLs (GLTF, KTX2, textures)
- LOD level requirements
- Device capabilities

## Outputs

- Loaded 3D objects
- Decoded textures
- Optimized geometry

## Runtime Budget

- Initial zone payload: ≤ 5 MB
- Texture memory: 200-300 MB
- Loading time: ≤ 1.5 seconds on 4G

## Acceptance Criteria

- Assets load with appropriate LOD levels
- KTX2 textures decode correctly
- Memory usage stays within budget
- Initial zone loads within time budget

