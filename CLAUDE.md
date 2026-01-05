# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Quick Tier List** - A simple, client-side tier list maker built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies. Just open `index.html` in a browser.

## Files

- `index.html` - Main HTML structure
- `styles.css` - All styling with CSS variables and dark mode support
- `script.js` - All functionality (drag-drop, localStorage, image compression)
- `favicon.svg` / `favicon.png` - Site icons

## Development

No build step required. To develop:

1. Open `index.html` in a browser
2. Edit files and refresh

For live reload, use any simple HTTP server:
```bash
python -m http.server 8000
# or
npx serve
```

## Architecture

### State Management
All state is stored in a single `state` object in `script.js`:
- `tierData` - Images organized by tier (S, A, B, C, D, unranked)
- `tierNames` - Customizable tier labels
- `isStreamerMode` - Layout toggle
- `tableWidth` - Resizable container width

### Data Persistence
Four localStorage keys:
- `tierListData` - Main tier data
- `tierNames` - Custom tier names
- `isStreamerMode` - Layout preference
- `tableWidth` - Saved width

### Image Processing
Images are compressed to 150x150px JPEG at 70% quality and stored as base64 data URLs in localStorage.

### CSS Variables
All colors, sizes, and shadows are defined as CSS variables in `:root` for easy theming. Dark mode is handled via `@media (prefers-color-scheme: dark)`.

## Key Features

- Drag and drop images between tiers
- Drop files directly to upload
- Editable tier names (max 18 chars)
- Sort/shuffle unranked items
- Resizable container width
- Streamer mode (left-aligned layout)
- Dark mode (follows system preference)
- All data stored locally in browser
