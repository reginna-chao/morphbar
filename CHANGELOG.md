# Changelog

All notable changes to **MorphBar** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-04-08

### Added

- **Alignment Guides** (#5)
  - Horizontal/vertical guide lines during point drag
  - Snap-to-guide with configurable tolerance
  - Center alignment guides (x=50, y=50)
  - Cross-point alignment detection

- **Mirror System** (#3)
  - MirrorManager UI for creating mirror groups
  - Horizontal/vertical mirroring with real-time sync
  - Source→Target one-way synchronization
  - Target lines disabled on canvas to prevent conflicting edits
  - Visual Source/Target badges in LineManager

- **Horizontal Shift Animation** (#6)
  - Configurable horizontal offset for menu↔close transition
  - SVG `<g>` wrapper with CSS `translateX` animation
  - Range slider + number input in Code Panel (-200 to 200)
  - Conditional code generation (clean output when shift is 0)

### Changed

- **Code Panel layout** — Code output now uses flex layout with min-height for better visibility on small screens
- **Module extraction** — Refactored mirror helpers into `utils/mirror.ts` and path calculation into `utils/pathCalculation.ts` to reduce file length

---

## [1.2.0] - 2025-11-30

### Added

- **Light/Dark Mode Theme Switching** (#15)
  - Auto-detect system color scheme preference
  - Manual toggle with Sun/Moon icons
  - LocalStorage persistence for user preference
  - Full CSS variable system support

- **Dynamic Line Count** (#4)
  - Support for 1–10 lines
  - Automatic 10-color cycling system
  - Add/Delete line controls
  - Minimum requirement of at least one line

- **Reverse Lines** (#1)
  - One-click reverse line direction (swap start/end points)
  - Reverses both Menu and Close states simultaneously
  - Visualized control with ArrowLeftRight icon

- **Swap Line Positions** (#14)
  - Dropdown menu to select target line
  - Swaps only the Menu state; Close state remains unchanged
  - Color indicators for easier identification
  - Auto-closes dropdown when clicking outside

- **Code Output Size Settings** (#12)
  - Adjustable SVG output width (20–200px)
  - Dynamically generated CSS
  - Stroke width configuration reserved for Style Panel phase

- **Tooltip System**
  - Integrated `react-tooltip` library
  - Enhanced user experience with contextual help

---

## [1.1.0] - 2025-11-30

### Added

- **Add Path Points (Multi-point Path)** (#8)
  - Multi-point path system (PathPoint architecture refactor)
  - Three editing tools: Select / Pen+ / Pen-
  - Path editing features (insert, extend, delete points)

- **Other Features**
  - Enhanced visual feedback (hover, focus, preview, icons)
  - Toast notification system

---

## [1.0.0] - 2025-11-29

- 🎉 Basic editor release!

- **Project Branding**
  - Renamed project to **MorphBar**
  - Added new logo design and integration
  - Added GitHub repository link

---

**Maintainer**：@reginna-chao
