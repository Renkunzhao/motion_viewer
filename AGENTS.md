# Motion Viewer — Repository Agent Rules

## Default language
- Reply in Chinese by default even if the user asks in English.
- Keep code, commands, filenames, and identifiers in English.
- If necessary, include English keywords once in parentheses, then continue in Chinese.

## Required workflow
- Always output in this structure:
  1) Plan (files to touch + validation steps)
  2) Resource findings (ref/ + models/ + motions paths)
  3) Changes (what and why)
  4) Validation (how to verify)
  5) Docs update (README.md + README.zh.md sections changed)
- When adding new features, do not break existing functionality or workflows unless explicitly requested.
- Read README.md to understand existing functionality before implementation.
- Prefer minimal, localized changes; add comments where helpful, but avoid redundancy.

### Navigate for resources (MANDATORY)
When implementing features or debugging:
1. Prefer searching `ref/` FIRST for similar implementations (must cite at least 1 relevant file path if exists).
2. Consult `models/` and `motions/` for real asset formats, naming conventions, joint order, and example data.
3. Avoid scanning large folders blindly:
   - Do keyword search first.
   - Open at most 5 files per large folder (`ref/`, `models/`, `motions/`) unless explicitly requested.

#### Suggested keywords
- viewer / three / threejs / meshcat / viser
- gltf / glb / urdf / mjcf / smpl
- motion / npz / csv / bvh / retarget / joint order
- loader / parser / skeleton / pose / quaternion

#### Notes
- `ref/` contains open-source reference repositories with similar functionality. Use it as the primary example source.
- `models/` stores robot model files (URDF/MJCF/GLB/...).
- `motions/` stores motion files (NPZ/CSV/BVH/...).

### Docs update checklist
- After implementing a request, you must update BOTH READMEs:
  - README.md (English)
  - README.zh.md (Chinese)
- Keep information consistent across both files.
- Only edit relevant sections; explicitly list the section titles you changed in both READMEs.

## Safety
- Default to read-only actions (search/open/read) first.
- Any network download (curl/wget/pip install) requires explicit approval.
- If necessary, you may `git clone` an open-source repository into `ref/` for reference, but only after explicit user approval.
  - Prefer minimal clone (shallow/single-branch) and do not download large assets unless required.
- Before executing any of the above, print the exact commands you plan to run and wait for approval.