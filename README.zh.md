# motion_viewer

[English](README.md) | 中文

`motion_viewer` 是一个面向机器人模型与动作数据的网页可视化工具。

它的核心用途是在浏览器中快速加载机器人模型并播放动作序列，用于数据检查、模型验证、调试和演示。

## 项目用途

- 快速验证 URDF 模型与资源路径是否正确（支持拖拽文件夹和多文件加载）
- 在 3D 视图中直观检查机器人结构与姿态
- 逐帧播放动作序列，定位动作质量问题
- 作为机器人算法与数据流程中的可视化检查环节

## 如何使用

### 本地运行

1. 安装依赖：
   - `npm install`
2. 启动开发服务器：
   - `npm run dev`
3. 打开 Vite 输出的本地地址。

### 加载数据

- 使用左上角 `Datasets` 面板中的 `Preset Motion` 下拉框并点击 `Load Preset`，可直接加载内置示例。
- 或拖拽本地文件/文件夹：
  - URDF 流程：先拖入 `.urdf` 及 mesh 资源，再拖入动作 `.csv`
  - BVH 流程：直接拖入 `.bvh`
  - SMPL 流程：先拖入模型 `.npz` / `basicmodel_*.pkl`，再拖入动作 `.npz`（`poses/trans`）
- 也可以使用 `Select Folder` / `Select Files` 按钮选择文件。

### 播放控制

- `Space`：播放/暂停
- `R`：重置到第 1 帧
- `Tab`：切换视角模式（`root lock` / `free`）
- `Shift`：切换 SMPL 网格/骨骼显示
- Motion 滑块：按帧定位
- Motion 面板：
  - `FPS`：调整 CSV 播放速度
  - `BVH Unit`：切换 BVH 单位（`m`、`dm`、`cm`、`inch`、`feet`）

## 动作数据集支持
- [LAFAN1 (.bvh)](https://github.com/ubisoft/ubisoft-laforge-animation-dataset.git)
- [lafan1-resolved (.bvh)](https://github.com/orangeduck/lafan1-resolved.git)
- [unitree-LAFAN1-Retarget (.csv)](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset/tree/main)
- [AMASS (.npz)](https://amass.is.tue.mpg.de/download.php)

## 模型来源支持
- Skeleton：
  - `Skeleton`（对应 LAFAN1 / lafan1-resolved 行）
- Unitree（同一来源链接）：
  - [G1, H1, H1-2 (.urdf)](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset/tree/main)
- SMPL 家族：
  - [SMPL (.npz/.pkl)](https://smpl.is.tue.mpg.de/download.php)
  - [SMPL-H (.npz/.pkl)](https://mano.is.tue.mpg.de/download.php)
  - [SMPL-X (.npz/.pkl)](https://smpl-x.is.tue.mpg.de/download.php)

## 参考

- 参考仓库：https://github.com/fan-ziqi/robot_viewer.git
- [BVHView](https://theorangeduck.com/media/uploads/BVHView/bvhview.html)
- 本项目使用 Codex vibe coding 完成。
