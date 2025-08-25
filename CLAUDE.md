# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Tier List Maker** - a client-side web application built with Next.js, React, TypeScript, and Tailwind CSS. The app allows users to create tier lists by uploading images and dragging them into ranked tiers (S, A, B, C, D). All data is stored locally in the browser's localStorage with no server backend.

## Development Commands

- `npm run dev` - Start development server with Turbo (runs on http://localhost:3000)
- `npm run build` - Build production version with Turbo
- `npm start` - Start production server

## Core Architecture

### Single-Page Application Structure
The entire application is contained in `src/app/page.tsx` as a single React component. This is intentional - the app is simple enough to not require component splitting.

### Key Data Structures

```typescript
interface ImageItem {
  id: string    // Unique identifier
  src: string   // Base64 data URL of compressed image
  name: string  // Original filename
}

interface TierData {
  S: ImageItem[]
  A: ImageItem[]  
  B: ImageItem[]
  C: ImageItem[]
  D: ImageItem[]
  unranked: ImageItem[]  // Drop zone for uploaded images
}
```

### State Management
All state is managed via React hooks:
- `tierData` - Main data structure containing all images organized by tier
- `tierNames` - Customizable tier labels (default: S, A, B, C, D)
- `draggedItem` - Tracks currently dragged image for tier-to-tier movement
- `isUploading` - Upload progress state
- `isStreamerMode` - Layout toggle for streaming (left-aligned vs centered)

### Data Persistence
Three localStorage keys are used:
- `tierListData` - Main tier data structure
- `tierNames` - Custom tier names
- `isStreamerMode` - Layout preference

### Image Processing Pipeline
1. **File Upload** - Users drop images into the "Items" area
2. **Compression** - Images are resized to 150x150px and compressed to JPEG (70% quality)
3. **Background Color** - White background for light mode, gray-800 (#1F2937) for dark mode
4. **Storage** - Converted to base64 data URLs and stored in localStorage

### Dark Mode Implementation
Uses Tailwind's `dark:` prefix classes that respond to `prefers-color-scheme: dark`. No JavaScript theme switching - relies entirely on system preference.

### Drag and Drop System
- **Image Movement** - Drag images between tiers using React DragEvent handlers
- **File Upload** - Drop image files directly into the "Items" area
- **Conflict Prevention** - Uses `stopPropagation()` to prevent file drops from interfering with image movement

## Key Features

### Dynamic Tier Sizing
Tier labels can be customized up to 18 characters. The `getMaxTierWidth()` function calculates the width needed based on the longest tier name, ensuring all tiers maintain consistent alignment.

### Streamer Mode
Toggle between centered layout (normal) and left-aligned layout (streamer mode) to accommodate webcam overlays during streaming.

### Performance Optimizations
- Sequential image processing with 100ms delays to prevent localStorage quota errors
- Error handling for localStorage quota exceeded scenarios
- Progress indicators for batch uploads

## Styling Approach

Uses Tailwind CSS with:
- Responsive design patterns
- Dark mode variants throughout
- Color-coded tiers (S=red, A=orange, B=yellow, C=green, D=blue)
- Hover states and transitions for interactive elements