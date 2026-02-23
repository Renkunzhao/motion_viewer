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
- Implemented: URDF drag-and-drop loading, basic status panel, basic motion playback controls
- Typical use case: quick visual validation for local model and motion files

## Data Types (Target Support)

### Models

- URDF (.urdf)
- MuJoCo MJCF (.xml)
- SMPL / SMPL-X (.pkl)

### Motions

- CSV (.csv)
- NumPy NPZ (.npz)
- BVH (.bvh)
- FBX (.fbx)

## References

- Reference repository: https://github.com/fan-ziqi/robot_viewer.git
- This project was completed using Codex vibe coding.
