# motion_viewer

[English](README.md) | 中文

`motion_viewer` 是一个面向机器人模型与动作数据的网页可视化工具。

它的核心用途是在浏览器中快速加载机器人模型并播放动作序列，用于模型验证、数据检查、调试和演示。

## 使用方式

### LAFAN1
- 下载 [LAFAN1](https://github.com/ubisoft/ubisoft-laforge-animation-dataset/blob/master/lafan1/lafan1.zip) 或 [lafan1-resolved](https://github.com/orangeduck/lafan1-resolved#Download)。
- 将 `.bvh` 文件直接拖入页面。

### Unitree-LAFAN1-Retargeting
- 下载 [Unitree-LAFAN1-Retargeting](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset)。
- 将 `robot_description` 下的 `g1/h1/h1_2` 文件夹拖入页面以加载 URDF。
- 再将对应目录下的任意动作文件（`.csv`）拖入页面。

### AMASS
- 下载 SMPL 模型 [SMPL-H (.npz)](https://download.is.tue.mpg.de/download.php?domain=mano&resume=1&sfile=smplh.tar.xz)、[SMPL-X](https://download.is.tue.mpg.de/download.php?domain=smplx&sfile=smplx_lockedhead_20230207.zip) 以及 [AMASS](https://amass.is.tue.mpg.de/download.php) 数据集。
- 根据想播放的动作文件，先拖入对应的模型文件夹，再拖入动作文件（`.npz`）。
  - 例如：若要可视化 `AMASS/ACCAD/SMPL-X G/Female1General_c3d/A1_-_Stand_stageii.npz`，应选择 `SMPL-X` 模型。

### OMOMO
- 下载 [SMPL-X](https://smpl-x.is.tue.mpg.de/download.php) 模型。
- OMOMO 数据集会把所有动作打包在一个 `.p` 文件里，文件太大，不适合直接在浏览器中加载。
- 你可以下载原始数据集 [OMOMO](https://drive.google.com/file/d/1tZVqLB7II0whI-Qjz-z-AU3ponSEyAmm/view?usp=sharing)（约 21G），然后使用 [脚本](tools/convert_omomo_seq_to_motion_npz.py) 进行转换和拆分。
```bash
pip install joblib
python3 tools/convert_omomo_seq_to_motion_npz.py \
  --data-root <path-to-omomo-dir> \
  --output-dir-name <path-to-output-dir> \
  --overwrite
```
- 或者直接下载已经预处理好的数据集 [omomo-resolved](https://huggingface.co/datasets/Kunzhao/omomo-resolved)。
- 将 `SMPL-X` 模型文件夹拖入页面。
- 将 `captured_objects` 物体模型文件夹拖入页面。
- 将动作文件（`.npz`）拖入页面。

### Preset
- `dance1_subject1.bvh` BVH 文件来自 [LAFAN1](https://github.com/ubisoft/ubisoft-laforge-animation-dataset/blob/master/lafan1/lafan1.zip)。
- `g1`、`h1`、`h1_2` 的 URDF 以及对应的 `dance1_subject1.csv` 来自 [Unitree-LAFAN1-Retargeting](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset)。
- `SMPL-X Female` 模型来自 [SMPL-X](https://download.is.tue.mpg.de/download.php?domain=smplx&sfile=smplx_lockedhead_20230207.zip)。
- `SMPL-X G/Male2MartialArtsExtended_c3d/Extended_3_stageii.npz` 来自 [ACCAD](https://amass.is.tue.mpg.de/download.php)。
- `largetable_cleaned_simplified.obj` 来自 [OMOMO](https://drive.google.com/file/d/1tZVqLB7II0whI-Qjz-z-AU3ponSEyAmm/view?usp=sharing)。
- `sub1_largetable_013.npz` 来自 [omomo-resolved](https://huggingface.co/datasets/Kunzhao/omomo-resolved)。

*这些动作仅用于网站功能演示。仓库不提供模型或动作资源下载，请从原始来源获取并遵循其许可证条款。如有侵权问题，请联系 rkzdtc@gmail.com。*

### 播放控制

- `Space`：播放 / 暂停
- `R`：重置到第 1 帧
- `Tab`：切换视图模式（`root lock` / `free`）
- `Shift`：切换 SMPL 网格 / 骨骼显示
- Motion 滑块：按帧定位
- Motion 面板：
  - `FPS` 输入框：调整 CSV 播放速度
  - `BVH Unit` 下拉框：切换 BVH 单位（`m`、`dm`、`cm`、`inch`、`feet`）

## 本地运行

1. 安装 [npm](https://nodejs.org/en/download/)。
2. 安装依赖、构建并启动开发服务器：
```bash
npm install
npm run build
npm run dev
```
3. 打开 Vite 输出的 URL。

## 参考
- [robot_viewer](https://github.com/fan-ziqi/robot_viewer.git)
- [urdf-loaders](https://github.com/gkjohnson/urdf-loaders.git)
- [BVHView](https://github.com/orangeduck/BVHView.git)
- [amass](https://github.com/nghorbani/amass)
- [body_visualizer](https://github.com/nghorbani/body_visualizer.git)
- [human_body_prior](https://github.com/nghorbani/human_body_prior.git)
- [omomo_release](https://github.com/lijiaman/omomo_release.git)
- [GMR](https://github.com/YanjieZe/GMR.git)
- 本项目使用 Codex vibe coding 完成。
