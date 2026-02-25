# motion_viewer

English | [中文](README.zh.md)

`motion_viewer` is a web-based visualization tool for robot models and motion data.

Its core purpose is to quickly load robot models in the browser and play motion sequences for data inspection, model validation, debugging, and demos.

## What This Repository Is For

- Quickly validate URDF models and asset paths (supports folder drag-and-drop and multi-file loading)
- Inspect robot structure and pose directly in a 3D view
- Play motion sequences frame by frame to diagnose motion quality issues
- Serve as a visualization checkpoint in robotics algorithm and data pipelines

## Current Scope

- Stack: Vite + TypeScript + Three.js + urdf-loader
- Implemented: preset dropdown loading, URDF drag-and-drop loading, CSV motion playback, BVH drag-and-drop playback, SMPL model (`.npz` / `basicmodel_*.pkl`) + motion NPZ playback, basic status panel, and playback controls
- Typical use case: quick visual validation for local model and motion files

## Supported Input And Operations

- Presets (bundled static assets): choose from dropdown and click `Load Preset`, no local file selection required
- URDF (.urdf): drag and drop folder/multi-file set, or use Select Folder/Select Files
- CSV (.csv): requires URDF loaded first; if URDF is missing, center panel shows guidance
- Dropping CSV while only BVH is loaded shows temporary warning, then auto-returns to ready layout
- BVH (.bvh): drag and drop to play in BVH preview mode
- BVH playback uses Y-up orientation and auto-recenters first-frame root X/Z offset
- BVH unit parsing can be switched in Motion panel with `BVH Unit` dropdown (`m`, `dm`, `cm`, `inch`, `feet`)
- In `root lock` view mode, BVH now tracks the animated root bone position (similar to BVHView `track`)
- SMPL model files: supports `.npz` and legacy `smpl_webuser` `basicmodel_*.pkl`; model can be loaded first as static body preview
- SMPL motion NPZ (.npz): after a SMPL model is loaded, drop motion NPZ (AMASS-style `poses/trans`) to start playback
- SMPL playback FPS reads `mocap_framerate.npy` or `mocap_frame_rate.npy` when present; otherwise defaults to 30
- While in SMPL mode, dropping a motion-only NPZ replaces SMPL motion while reusing the current SMPL model
- SMPL static preview uses Y-up; SMPL motion playback uses AMASS-compatible orientation to keep animated poses upright
- SMPL rendering now uses an AMASS-inspired clay material with directional shadow lighting while keeping the same background/grid style as URDF/BVH scenes
- While in SMPL mode, press `Shift` to toggle between skinned mesh and skeleton-only rendering
- SMPL skeleton mode now follows the same orientation handling as skinned mesh during motion playback (no sideways flip on motion load)
- Skeleton lines now use a high-contrast cyan color in both SMPL skeleton mode and BVH playback for readability on dark backgrounds
- `smpl_webuser` here refers to the historical Python package naming from SMPL release, not browser/Web runtime
- Frontend SMPL PKL parsing now relies on `pickleparser` only (no project-local fallback pickle parser)
- Unsupported drops can trigger a temporary red warning panel, then return to ready layout while keeping the last warning in the lower-left hint
- Controls: `Space` play/pause, `R` reset to frame 1, `Tab` switch view mode, `Shift` toggle SMPL mesh/skeleton, slider seek
- CSV playback FPS is editable in the Motion panel via the `FPS` input box (takes effect immediately)

## Static Preset Deployment

The viewer can ship built-in model/motion assets for static hosting (GitHub Pages, nginx, etc.).
Visitors can open the site and load presets directly from the dropdown without cloning the repo.

- Preset manifest: `public/presets/presets.json`
- Bundled preset assets: `public/presets/models/*` and `public/presets/motions/*`

Each preset can define:

- `model` (recommended): `urdfPath` only, e.g. `presets/models/g1/g1_29dof_rev_1_0.urdf`
- `motion` (recommended): `kind: "csv" | "bvh" | "smpl"` + `path`
- Legacy format is still supported:
  - `model.files[]` with optional `selectedUrdfPath`
  - `motion.files[]` with optional `selectedMotionPath`

Notes:

- `model.urdfPath` mode no longer requires listing every mesh file in `presets.json`; mesh resources are resolved by URL relative to the URDF location.
- This is better for large robot assets copied directly into `public/presets/models/*`.
- For SMPL presets, use `motion.kind: "smpl"` and provide model files (`.npz` or `basicmodel_*.pkl`) plus motion NPZ via `model.files[]` + `motion.files[]` (or `motion.path`).

After editing presets/assets, rebuild and redeploy static files:

- `npm run build`

## Data Types (Current + Target)

### Models

- URDF (.urdf)
- MuJoCo MJCF (.xml)
- SMPL / SMPL-X model NPZ (.npz) [Implemented]
- Legacy SMPL `basicmodel_*.pkl` from `smpl_webuser` [Implemented, pickleparser]

### Motions

- CSV (.csv) [Implemented]
- NumPy NPZ (.npz, SMPL `poses/trans`) [Implemented]
- BVH (.bvh) [Implemented]
- FBX (.fbx)

## Robot Support

- Verified support: Unitree `G1`, `H1`, `H1-2`
- Motion CSV parsing is now URDF-driven (joint mapping is not hardcoded to G1)
- Supports both CSV modes:
  - Header-based mapping by joint names
  - Ordered mapping using URDF non-fixed joint declaration order

## Motion Support
- [LAFAN1](https://github.com/ubisoft/ubisoft-laforge-animation-dataset.git)
- [lafan1-resolved](https://github.com/orangeduck/lafan1-resolved.git)
- [unitree-LAFAN1-Retarget](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset/tree/main)

## References

- [Robot Viewer](https://viewer.robotsfan.com/)
- [BVHView](https://theorangeduck.com/media/uploads/BVHView/bvhview.html)
- This project was completed using Codex vibe coding.
