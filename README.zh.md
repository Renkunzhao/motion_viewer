# motion_viewer

[English](README.md) | 中文

`motion_viewer` 是一个面向机器人模型与动作数据的网页可视化工具。

它的核心用途是在浏览器中快速加载机器人模型并播放动作序列，用于数据检查、模型验证、调试和演示。

## 项目用途

- 快速验证 URDF 模型与资源路径是否正确（支持拖拽文件夹和多文件加载）
- 在 3D 视图中直观检查机器人结构与姿态
- 逐帧播放动作序列，定位动作质量问题
- 作为机器人算法与数据流程中的可视化检查环节

## 当前范围

- 技术栈：Vite + TypeScript + Three.js + urdf-loader
- 已实现：预置下拉加载、URDF 拖拽加载、CSV 动作播放、BVH 拖拽播放、基础状态面板与播放控制
- 典型场景：本地模型与动作文件的快速可视化验证

## 支持的输入与操作

- 预置（静态内置资源）：在下拉框选择并点击 `Load Preset`，无需本地选文件
- URDF (.urdf)：支持拖拽文件夹/多文件集合，或使用 Select Folder / Select Files
- CSV (.csv)：需先加载 URDF；若未加载 URDF，会在中心面板给出引导提示
- 仅加载 BVH 时若拖入 CSV，会短暂告警并自动回到 ready 布局
- BVH (.bvh)：直接拖入即可在 BVH 预览模式播放
- BVH 播放采用 Y-up 朝向，并会自动消除首帧根节点 X/Z 偏移以居中
- 在 `root lock` 视角模式下，BVH 现已跟踪动画根骨骼位置（类似 BVHView 的 `track`）
- 拖入不支持文件时会短暂显示红色告警面板，随后自动回到 ready 布局，并在左下角保留上一条告警提示
- 操作：`Space` 播放/暂停，`R` 重置到第 1 帧，`Tab` 切换视角模式，滑块可拖动定位帧
- CSV 播放频率可在 Motion 面板的 `FPS` 输入框中直接修改（即时生效）

## 静态站点预置部署

查看器支持把模型/动作作为静态资源随网站一起发布（如 GitHub Pages、nginx）。
访问者打开网页后，可直接通过下拉框加载预置，无需 clone 仓库或本地运行。

- 预置清单：`public/presets/presets.json`
- 预置资源目录：`public/presets/robots/*` 与 `public/presets/motions/*`

每个 preset 可包含：

- `model`（推荐）：仅配置 `urdfPath`，例如 `presets/robots/g1/g1_29dof_rev_1_0.urdf`
- `motion`（推荐）：配置 `kind: "csv" | "bvh"` 与 `path`
- 旧格式仍兼容：`model.files[]`（可选 `selectedUrdfPath`）
- 旧格式仍兼容：`motion.files[]`（可选 `selectedMotionPath`）

说明：

- 使用 `model.urdfPath` 时，不再需要在 `presets.json` 里手工列出所有 mesh 文件。
- mesh 资源会按 URDF 所在路径做 URL 相对解析，更适合把大体积机器人资源直接放进 `public/presets/robots/*`。

修改预置后，重新构建并部署静态文件：

- `npm run build`

## 机器人支持

- 已验证支持：Unitree `G1`、`H1`、`H1-2`
- 动作 CSV 解析已改为基于 URDF 自动映射（不再写死 G1 关节）
- 支持两种 CSV 模式：
  - 带表头：按关节名映射
  - 无表头：按 URDF 中 non-fixed 关节声明顺序映射

## 数据类型（当前 + 目标）

### 模型

- URDF (.urdf)
- MuJoCo MJCF (.xml)
- SMPL / SMPL-X (.pkl)

### 动作

- CSV (.csv)【已实现】
- NumPy NPZ (.npz)
- BVH (.bvh)【已实现】
- FBX (.fbx)

## 参考

- 参考仓库：https://github.com/fan-ziqi/robot_viewer.git
- [BVHView](https://theorangeduck.com/media/uploads/BVHView/bvhview.html)
- 本项目使用 Codex vibe coding 完成。
