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
- 已实现：URDF 拖拽加载、基础状态面板、基础动作播放控制
- 典型场景：本地模型与动作文件的快速可视化验证

## 机器人支持

- 已验证支持：Unitree `G1`、`H1`、`H1-2`
- 动作 CSV 解析已改为基于 URDF 自动映射（不再写死 G1 关节）
- 支持两种 CSV 模式：
  - 带表头：按关节名映射
  - 无表头：按 URDF 中 non-fixed 关节声明顺序映射

## 数据类型（目标支持）

### 模型

- URDF (.urdf)
- MuJoCo MJCF (.xml)
- SMPL / SMPL-X (.pkl)

### 动作

- CSV (.csv)
- NumPy NPZ (.npz)
- BVH (.bvh)
- FBX (.fbx)

## 参考

- 参考仓库：https://github.com/fan-ziqi/robot_viewer.git
- 本项目使用 Codex vibe coding 完成。
