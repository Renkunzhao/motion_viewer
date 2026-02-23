# motion_viewer

## viewer
- viser
- three.js

## Phase 1 (implemented)
- URDF drag-and-drop loading frontend
- stack: Vite + TypeScript + Three.js + urdf-loader
- supports dragging folders / multiple files
- Chromium (Chrome / Edge) has full folder drag support

## Run

```bash
npm install
npm run dev
```

Build and tests:

```bash
npm run build
npm run test
```

## Deploy (same model as robot_viewer)

This project is a static site. Deployment is:
1. Build to `dist/`
2. Publish `dist/` using any static hosting service (Nginx, GitHub Pages, OSS, etc.)

```bash
npm ci
npm run build
```

### Option A: Nginx

Copy `dist/` to server, then use config like:

```nginx
server {
  listen 80;
  server_name your.domain.com;

  root /var/www/motion_viewer/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Option B: GitHub Release artifact (like robot_viewer)

`/.github/workflows/release.yml` is added.
When you publish a GitHub Release tag, Actions will:
1. Build the site
2. Zip `dist/` into `motion-viewer-<tag>.zip`
3. Upload it to Release assets

You can download that zip and publish it on your server/CDN.

### Notes

- `vite.config.ts` now uses `base: './'`, so the built files can be hosted under a sub-path (not only domain root).
- For quick local verification after build:

```bash
npm run preview
```

## Supported Files

### Models
- URDF (.urdf)
- MuJoCo MJCF (.xml)
- SMPL / SMPL-X (body model, e.g. .pkl)

### Motions
- CSV (.csv)
- NumPy NPZ (.npz)
- BVH (motion capture) (.bvh)
- FBX (.fbx)
