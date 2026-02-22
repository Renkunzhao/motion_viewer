# motion_viewer

## viewer
- viser
- three.js

## Phase 1 (implemented)
- URDF drag-and-drop loading frontend
- stack: Vite + TypeScript + Three.js + urdf-loader
- supports dragging folders / multiple files
- Chromium (Chrome / Edge) has full folder drag support

## Run

```bash
npm install
npm run dev
```

Build and tests:

```bash
npm run build
npm run test
```

## Supported Files

### Models
- URDF (.urdf)
- MuJoCo MJCF (.xml)
- SMPL / SMPL-X (body model, e.g. .pkl)

### Motions
- CSV (.csv)
- NumPy NPZ (.npz)
- BVH (motion capture) (.bvh)
- FBX (.fbx)
