# Tessera

**AI-powered tilemap generator with Unity awareness, strict rule enforcement, and granular refinement.**

![Status](https://img.shields.io/badge/status-Phase%201%20Complete-green)
![React](https://img.shields.io/badge/React-19-blue)
![PixiJS](https://img.shields.io/badge/PixiJS-8-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

## What is Tessera?

Tessera is a modern, web-based tool that lets game developers generate 2D tilemaps using AI — then refine them with surgical precision. Unlike existing tools, Tessera:

- **Understands Unity** — Exports Rule Tiles, palettes, and colliders natively
- **Enforces Rules** — Define constraints in plain text ("water never touches grass")
- **Supports Granular Regeneration** — Regenerate by layer, region, or individual tile while preserving your edits

## Current Status

**Phase 1: Foundation** ✅ Complete

- ✅ React 19 + PixiJS v8 + Vite scaffold
- ✅ Pan/zoom viewport with pixi-viewport
- ✅ Toggleable grid overlay
- ✅ New Map dialog (8x8 → 64x64)
- ✅ Keyboard shortcuts (G = toggle grid)
- ✅ Zustand state management

**Coming Soon:**
- Phase 2: Editor Core (brush, fill, eraser, layers, undo/redo)
- Phase 3: AI Integration (natural language → tilemap)
- Phase 4: Rules & Export (Unity Rule Tiles, TMX)
- Phase 5: Polish & Persistence

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/tessera.git
cd tessera

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
pnpm run build
pnpm run preview
```

## Project Structure

```
tessera/
├── src/
│   ├── components/
│   │   ├── Canvas.tsx          # PixiJS canvas with viewport
│   │   ├── TileMapRenderer.tsx # Tile rendering + grid
│   │   ├── Toolbar.tsx         # Top toolbar
│   │   ├── GridOverlay.tsx     # Grid lines component
│   │   └── NewMapDialog.tsx    # Map creation modal
│   ├── stores/
│   │   ├── mapStore.ts         # Tilemap state (Zustand)
│   │   └── viewportStore.ts    # Viewport state (zoom, grid)
│   ├── types/
│   │   └── map.ts              # TypeScript interfaces
│   ├── pixi.ts                 # PixiJS extension setup
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI Framework | React 19 |
| State Management | Zustand 5 + Immer |
| Canvas Rendering | PixiJS v8 + @pixi/react |
| Viewport | pixi-viewport v6 |
| Build Tool | Vite 6 |
| Language | TypeScript 5.6 |

## Controls

| Action | Control |
|--------|---------|
| Pan | Click + Drag |
| Zoom | Scroll Wheel |
| Toggle Grid | Press `G` |
| New Map | Click "New Map" button |

## Roadmap

See [.planning/ROADMAP.md](.planning/ROADMAP.md) for the full 5-phase development plan.

## License

MIT

---

Built with 🧠 by [Cortex](https://github.com/nilocortex) + Claude
