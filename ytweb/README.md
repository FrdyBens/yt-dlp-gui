# ytweb (yt-dlp pastel UI)

A production-ready, LAN-friendly yt-dlp orchestrator with a pastel, "girly" themed React UI. The Node.js backend manages yt-dlp/ffmpeg jobs, caching, signed download links, and WebSocket progress updates.

## Features
- URL inspection with cached `yt-dlp -J` metadata and thumbnails.
- Preset + custom download flows covering best quality, audio-only, subtitles, and advanced ffmpeg-enabled post-processing.
- Multi-user job queue with rate limiting, resumable downloads, and detailed progress via Socket.IO.
- Signed download links streaming from the server cache with retention policies and crash-safe job logs.
- Admin dashboard for local tweaks plus health/version/disk checks.
- Responsive React + Tailwind UI in a lilac/pink palette, complete with job drawer, skeletons, and accessibility-friendly controls.

## Requirements
- Node.js LTS (18+ recommended).
- pnpm 8+ (used for workspaces and scripts).
- System-installed `yt-dlp` and `ffmpeg` available on `$PATH`.
- macOS/Linux/WSL2/Windows supported. Ensure PowerShell execution policy allows scripts when using pnpm on Windows.

## Getting Started
```bash
cp .env.example .env
pnpm install
pnpm dev
```
The dev server runs both Vite (client) and Express (server). The backend binds to `0.0.0.0:5000` and will list LAN URLs on boot.

### Production build
```bash
pnpm build
pnpm start
```
This builds the React app, compiles the TypeScript backend, and serves the static assets from the Express server.

## Testing
```bash
pnpm test
```
Runs Vitest suites in the server package, covering the progress parser and a guarded smoke test that executes `yt-dlp -J` when available.

## Troubleshooting
- **`yt-dlp` missing**: Install from https://github.com/yt-dlp/yt-dlp/releases and ensure it is on PATH.
- **`ffmpeg` missing**: Install ffmpeg to enable thumbnail/metadata embedding and advanced muxing.
- **`yt-dlp -U` HTTP 403**: Update manually via release artifacts; some hosts block auto-updater.
- **Geo/age restrictions**: Provide cookies via yt-dlp config if you own the rights. The UI surfaces these errors explicitly.

## Legal Note
Only download content you own or have permission to download. Respect copyrights and platform terms of service.
