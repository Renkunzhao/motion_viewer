# motion_viewer

English | [中文](README.zh.md)

`motion_viewer` is a web-based visualization tool for robot models and motion data.

Its core purpose is to quickly load robot models in the browser and play motion sequences for data inspection, model validation, debugging, and demos.

## What This Repository Is For

- Quickly validate URDF models and asset paths (supports folder drag-and-drop and multi-file loading)
- Inspect robot structure and pose directly in a 3D view
- Play motion sequences frame by frame to diagnose motion quality issues
- Serve as a visualization checkpoint in robotics algorithm and data pipelines

## How To Use

### Run locally

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Open the URL printed by Vite.

### Load data

- Use `Preset Motion` in the top-left `Datasets` panel and click `Load Preset` for built-in demos.
- Or drag and drop local files/folders:
  - URDF workflow: drop `.urdf` + mesh resources, then drop motion `.csv`
  - BVH workflow: drop `.bvh`
  - SMPL workflow: drop model `.npz` / `basicmodel_*.pkl`, then drop motion `.npz` (`poses/trans`)
- You can also use `Select Folder` / `Select Files` instead of drag-and-drop.

### Playback controls

- `Space`: play/pause
- `R`: reset to frame 1
- `Tab`: switch view mode (`root lock` / `free`)
- `Shift`: toggle SMPL mesh/skeleton
- Motion slider: seek by frame
- Motion panel:
  - `FPS` input for CSV playback speed
  - `BVH Unit` dropdown (`m`, `dm`, `cm`, `inch`, `feet`)

## Motion Support
- [LAFAN1 (.bvh)](https://github.com/ubisoft/ubisoft-laforge-animation-dataset.git)
- [lafan1-resolved (.bvh)](https://github.com/orangeduck/lafan1-resolved.git)
- [unitree-LAFAN1-Retarget (.csv)](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset/tree/main)
- [AMASS (.npz)](https://amass.is.tue.mpg.de/download.php)

## Model Support
- Skeleton:
  - `Skeleton` (for LAFAN1 / lafan1-resolved rows)
- Unitree (same source link):
  - [G1, H1, H1-2 (.urdf)](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset/tree/main)
- SMPL family:
  - [SMPL (.npz/.pkl)](https://smpl.is.tue.mpg.de/download.php)
  - [SMPL-H (.npz/.pkl)](https://mano.is.tue.mpg.de/download.php)
  - [SMPL-X (.npz/.pkl)](https://smpl-x.is.tue.mpg.de/download.php)

## References

- [Robot Viewer](https://viewer.robotsfan.com/)
- [BVHView](https://theorangeduck.com/media/uploads/BVHView/bvhview.html)
- This project was completed using Codex vibe coding.
