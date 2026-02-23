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
- 已实现：URDF 拖拽加载、CSV 动作播放、BVH 拖拽播放、基础状态面板与播放控制
- 典型场景：本地模型与动作文件的快速可视化验证

## 支持的输入与操作

- URDF (.urdf)：支持拖拽文件夹/多文件集合，或使用 Select Folder / Select Files
- CSV (.csv)：需先加载 URDF；若未加载 URDF，会在中心面板给出引导提示
- 仅加载 BVH 时若拖入 CSV，会短暂告警并自动回到 ready 布局
- BVH (.bvh)：直接拖入即可在 BVH 预览模式播放
- BVH 播放采用 Y-up 朝向，并会自动消除首帧根节点 X/Z 偏移以居中
- 在 `root lock` 视角模式下，BVH 现已跟踪动画根骨骼位置（类似 BVHView 的 `track`）
- 拖入不支持文件时会短暂显示红色告警面板，随后自动回到 ready 布局，并在左下角保留上一条告警提示
- 操作：`Space` 播放/暂停，`R` 重置到第 1 帧，`Tab` 切换视角模式，滑块可拖动定位帧

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
