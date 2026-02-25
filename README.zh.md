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
- 已实现：预置下拉加载、URDF 拖拽加载、CSV 动作播放、BVH 拖拽播放、SMPL 模型（`.npz` / `basicmodel_*.pkl`）+ 动作 NPZ 播放、基础状态面板与播放控制
- 典型场景：本地模型与动作文件的快速可视化验证

## 支持的输入与操作

- 预置（静态内置资源）：在左上角 `Datasets` 面板的 `Preset Motion` 下拉框选择并点击 `Load Preset`，无需本地选文件
- 左上角 `Datasets` 面板改为两列表格：`Dataset` / `Models`
- 文件格式已直接写在链接文本后面的括号中，例如 `LAFAN1 (.bvh)`
- 表格按三行区分来源：
  - 第 1 行：`LAFAN1` + `lafan1-resolved`，模型为 `Skeleton`
  - 第 2 行：`unitree-LAFAN1-Retarget`，模型使用一个合并链接 `G1, H1, H1-2 (.urdf)`
  - 第 3 行：`AMASS`，模型为 `SMPL (.npz/.pkl)` / `SMPL-H (.npz/.pkl)` / `SMPL-X (.npz/.pkl)`
- 预置下拉框下方提供润色后的中英双语法律提示：仅用于演示、不提供下载、提醒遵循原始来源许可，并给出侵权联系邮箱
- 右侧状态面板保留快捷键说明
- URDF / CSV / BVH / SMPL 播放默认视角为 `root lock`；可按 `Tab` 切换到 `free`
- URDF (.urdf)：支持拖拽文件夹/多文件集合，或使用 Select Folder / Select Files
- CSV (.csv)：需先加载 URDF；若未加载 URDF，会在中心面板给出引导提示
- 仅加载 BVH 时若拖入 CSV，会短暂告警并自动回到 ready 布局
- BVH (.bvh)：直接拖入即可在 BVH 预览模式播放
- BVH 播放采用 Y-up 朝向，并会自动消除首帧根节点 X/Z 偏移以居中
- 可在 Motion 面板通过 `BVH Unit` 下拉框切换 BVH 单位解析（`m`、`dm`、`cm`、`inch`、`feet`）
- 在 `root lock` 视角模式下，BVH 现已跟踪动画根骨骼位置（类似 BVHView 的 `track`）
- SMPL 模型文件：支持 `.npz` 与旧版 `smpl_webuser` 的 `basicmodel_*.pkl`，可先单独加载为静态人体预览
- SMPL 动作 NPZ (.npz)：加载 SMPL 模型后，再拖入动作 NPZ（支持 AMASS 风格 `poses/trans`）即可播放
- SMPL 播放 FPS 优先读取 `mocap_framerate.npy` 或 `mocap_frame_rate.npy`，若缺失则默认 30
- 在 SMPL 模式下，后续可仅拖入动作 NPZ，在复用当前 SMPL 模型的前提下替换动作
- SMPL 静态预览使用 Y-up；SMPL 动作播放使用 AMASS 兼容朝向，确保动画姿态保持站立
- SMPL 渲染改为接近 AMASS 示例的浅肤色材质与方向光阴影，同时保持与 URDF/BVH 一致的背景和地面网格风格
- 在 SMPL 模式下可按 `Shift` 在带皮肤网格与纯骨骼显示之间切换
- SMPL 骨骼模式在动作播放时现与带皮肤网格使用同一套朝向处理（加载 motion 后不再侧躺翻转）
- 骨骼线条（SMPL 骨骼模式与 BVH 播放）统一使用高对比亮青色，便于在深色背景下观察
- 此处 `smpl_webuser` 指 SMPL 历史发布中的 Python 包命名，不是浏览器 Web 运行时
- 前端 SMPL PKL 解析现仅使用 `pickleparser`（不再使用项目内 pickle 回退解析器）
- 拖入不支持文件时会短暂显示红色告警面板，随后自动回到 ready 布局，并在左下角保留上一条告警提示
- 操作：`Space` 播放/暂停，`R` 重置到第 1 帧，`Tab` 切换视角模式，`Shift` 切换 SMPL 网格/骨骼显示，滑块可拖动定位帧
- CSV 播放频率可在 Motion 面板的 `FPS` 输入框中直接修改（即时生效）

## 静态站点预置部署

查看器支持把模型/动作作为静态资源随网站一起发布（如 GitHub Pages、nginx）。
访问者打开网页后，可直接通过左上角 `Datasets` 面板中的 `Preset Motion` 下拉框加载预置，
无需 clone 仓库或本地运行。

- 预置清单：`public/presets/presets.json`
- 预置资源目录：`public/presets/models/*` 与 `public/presets/motions/*`

每个 preset 可包含：

- `model`（推荐）：仅配置 `urdfPath`，例如 `presets/models/g1/g1_29dof_rev_1_0.urdf`
- `motion`（推荐）：配置 `kind: "csv" | "bvh" | "smpl"` 与 `path`
- 旧格式仍兼容：`model.files[]`（可选 `selectedUrdfPath`）
- 旧格式仍兼容：`motion.files[]`（可选 `selectedMotionPath`）

当前内置示例除 URDF+CSV/BVH 外，还新增了一个 SMPL-H 预置：
- 下拉显示：`SMPL-H G + Male2MartialArtsExtended_c3d 3_poses`
- 模型：`presets/SMPL+H G/Male2MartialArtsExtended_c3d/model.npz`
- 动作：`presets/SMPL+H G/Male2MartialArtsExtended_c3d/Extended 3_poses.npz`

说明：

- 使用 `model.urdfPath` 时，不再需要在 `presets.json` 里手工列出所有 mesh 文件。
- mesh 资源会按 URDF 所在路径做 URL 相对解析，更适合把大体积机器人资源直接放进 `public/presets/models/*`。
- 对于 SMPL preset，请使用 `motion.kind: "smpl"`，并通过 `model.files[]` + `motion.files[]`（或 `motion.path`）提供模型文件（`.npz` 或 `basicmodel_*.pkl`）与动作 NPZ。

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
- SMPL / SMPL-X 模型 NPZ (.npz)【已实现】
- 旧版 `smpl_webuser` 的 `basicmodel_*.pkl`【已实现（pickleparser）】

### 动作

- CSV (.csv)【已实现】
- NumPy NPZ (.npz，SMPL `poses/trans`)【已实现】
- BVH (.bvh)【已实现】
- FBX (.fbx)

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
