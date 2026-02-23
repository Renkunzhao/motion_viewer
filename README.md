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
- Implemented: URDF drag-and-drop loading, CSV motion playback, BVH drag-and-drop playback, basic status panel, and playback controls
- Typical use case: quick visual validation for local model and motion files

## Supported Input And Operations

- URDF (.urdf): drag and drop folder/multi-file set, or use Select Folder/Select Files
- CSV (.csv): requires URDF loaded first; if URDF is missing, center panel shows guidance
- Dropping CSV while only BVH is loaded shows temporary warning, then auto-returns to ready layout
- BVH (.bvh): drag and drop to play in BVH preview mode
- BVH playback uses Y-up orientation and auto-recenters first-frame root X/Z offset
- In `root lock` view mode, BVH now tracks the animated root bone position (similar to BVHView `track`)
- Unsupported drops can trigger a temporary red warning panel, then return to ready layout while keeping the last warning in the lower-left hint
- Controls: `Space` play/pause, `R` reset to frame 1, `Tab` switch view mode, slider seek

## Robot Support

- Verified support: Unitree `G1`, `H1`, `H1-2`
- Motion CSV parsing is now URDF-driven (joint mapping is not hardcoded to G1)
- Supports both CSV modes:
  - Header-based mapping by joint names
  - Ordered mapping using URDF non-fixed joint declaration order

## Data Types (Current + Target)

### Models

- URDF (.urdf)
- MuJoCo MJCF (.xml)
- SMPL / SMPL-X (.pkl)

### Motions

- CSV (.csv) [Implemented]
- NumPy NPZ (.npz)
- BVH (.bvh) [Implemented]
- FBX (.fbx)

## References

- [Robot Viewer](https://viewer.robotsfan.com/)
- [BVHView](https://theorangeduck.com/media/uploads/BVHView/bvhview.html)
- This project was completed using Codex vibe coding.
