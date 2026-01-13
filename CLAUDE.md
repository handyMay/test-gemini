# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based mind mapping application built with PixiJS. The project uses a clean separation between core logic (`mindmap-core.js`) and UI rendering (`main.js`).

## Project Status & Needs

**Note**: This project needs significant improvements in structure and documentation:
- Code organization could be better (consider separating UI components, utilities, and event handlers)
- Documentation is minimal - code needs more inline comments explaining complex logic
- File structure is flat - would benefit from organized directories (e.g., `src/`, `src/core/`, `src/ui/`)
- Many debug `console.log` statements should be removed or replaced with proper logging
- Configuration values (spacing, colors, sizes) are hardcoded throughout - should be centralized

**Dependency Philosophy**: This project aims to be **very frugal with dependencies**. Avoid adding new npm packages unless absolutely necessary. Prefer vanilla JavaScript implementations and built-in browser APIs. The only external dependency is PixiJS (loaded from CDN), and this minimalist approach should be maintained.

## Development Commands

```bash
# Run tests
npm test

# Serve the application locally
npx http-server -o
```

## Architecture

### Two-Layer Design

**Core Layer** (`mindmap-core.js`):
- Pure data management with no UI dependencies
- Manages nodes, connections, and layout algorithms
- Fully testable in isolation (see `test/mindmap.test.js`)
- Exports `MindMapCore` class with methods: `addNode`, `removeNode`, `connect`, `disconnect`, `findRoot`, `calculateSubtreeWidths`, `layoutTree`, etc.

**UI Layer** (`main.js`):
- PixiJS-based rendering and interaction
- Manages `Node` class (extends `PIXI.Graphics`) for visual representation
- Maps core node IDs to UI elements via `nodeUIMap`
- Handles all user interactions: click, double-click, drag, zoom, pan
- Synchronizes UI state with core data model

### Key Interaction Patterns

**Node Selection State**:
- `selectedNode`: Current selection used for creating connections
- `previousSelectedNode`: Fallback for connecting when no node is selected
- Double-clicking canvas creates new node and connects it to `selectedNode` or `previousSelectedNode`

**Event Flow**:
1. User interactions captured by PixiJS event handlers
2. UI layer updates visual state immediately
3. Core methods called to update data model
4. `updateLines()` redraws all connections based on core state

**Layout System**:
- Two layout modes: vertical (`layoutTree`) and horizontal (`layoutTreeHorizontal`)
- Root detection via `findRoot()` (finds node with no incoming connections)
- Subtree width/height calculation happens before positioning
- Known issue: Vertical layout has root node detection problems (see git history)

### Entry Point

`index.html` → loads PixiJS from CDN → loads `mindmap-core.js` → loads `main.js` → initialization begins

## Known Issues

- ~~Vertical layout not working correctly due to root node detection issue~~ **FIXED** (was commit: 5931be1, fixed during refactoring)
- Node connections use `previousSelectedNode` mechanism which may be confusing (design choice, not a bug)

## Code Inefficiencies & Technical Debt

### Critical Performance Issues (Fix First)

1. **Line Redrawing Performance** ⚠️ SEVERE
   - `updateLines()` redraws ALL connections on every mouse move during drag (main.js:115, 178-192)
   - With 100 nodes: 99 line redraws per pixel moved
   - App becomes unusable with 50+ nodes
   - **Fix**: Only redraw lines connected to the dragging node

2. **O(n²) Line Click Detection** ⚠️ SEVERE
   - Nested loop checks all node pairs on every canvas click (main.js:270-296)
   - No spatial indexing or optimization
   - Click lag grows exponentially with node count
   - **Fix**: Implement spatial indexing or quadtree for line segments

3. **Excessive Console.log Statements** ⚠️ HIGH
   - 25+ debug logs throughout production code
   - Console spam in layout functions (main.js:467-513, mindmap-core.js:86-119)
   - **Fix**: Remove or replace with proper logging system with levels

4. **O(n) Node Removal** ⚠️ MEDIUM
   - `removeNode()` scans all nodes to remove incoming connections (mindmap-core.js:28-30)
   - No reverse connection mapping maintained
   - Slow deletion in large graphs
   - **Fix**: Maintain parent reference map for O(1) lookup

5. **Memory Leaks** ⚠️ MEDIUM
   - PIXI objects not destroyed on node removal (main.js:121)
   - Event listeners (5 per node) might not clean up properly
   - Memory grows over time with node creation/deletion
   - **Fix**: Call `.destroy()` on PIXI objects and properly remove event listeners

### Important Issues (Fix Soon)

6. **No Event Throttling**
   - Pan/zoom events fire continuously without throttling (main.js:303-312, 375-392)
   - CPU waste on rapid updates
   - **Fix**: Throttle to 60fps maximum

7. **Text Recreation on Every Draw**
   - PIXI.Text content reassigned unnecessarily on every draw() call (main.js:81)
   - Called frequently during selection, dragging, etc.
   - Unnecessary garbage collection pressure
   - **Fix**: Only update text when label actually changes

8. **Repeated findRoot() Calls**
   - O(n) graph scan on every layout operation (main.js:485, 534)
   - Recalculated even when structure hasn't changed
   - **Fix**: Cache root node, invalidate on structure change

9. **Hardcoded Magic Numbers**
   - Values like 5, 10, 30, 150, 200, 350 scattered throughout code
   - Makes tuning and maintenance difficult
   - **Fix**: Create centralized constants object

10. **No Cycle Prevention**
    - `connect()` allows creating cycles in tree structure (mindmap-core.js:38-43)
    - Only checks for duplicate connections, not cycles
    - Can corrupt tree-based algorithms
    - **Fix**: Add cycle detection before connecting nodes

### Code Quality Issues

11. **Duplicate Layout Code**
    - Vertical and horizontal layout buttons have near-identical setup (main.js:467-514, 516-546)
    - Code duplication makes maintenance harder
    - **Fix**: Abstract common setup logic into shared function

12. **Scattered Global State**
    - 7+ global variables: selectedNode, previousSelectedNode, doubleClickPending, dragStartPos, isPanning, lastClickTime, lastClickPos
    - Hard to debug, easy to have inconsistent state
    - **Fix**: Consolidate into state object or use class-based approach

13. **No Error Handling**
    - Zero try-catch blocks anywhere in codebase
    - No validation of user input (file loading, text input)
    - Silent failures (layout abort just console.errors)
    - **Fix**: Add error boundaries for file operations and layout functions

14. **Direct Core Data Access**
    - UI directly iterates over `mindMapCore.nodes` (main.js:182-191, 270-294)
    - Breaks encapsulation, makes refactoring difficult
    - **Fix**: Add getter methods to core for controlled access

### Data Model Issues

15. **Layout Properties Pollute Node Data**
    - `subtreeWidth`/`subtreeHeight` are temporary layout values stored permanently (mindmap-core.js:16-17)
    - Mixed concerns: data vs. computed properties
    - **Fix**: Separate layout metadata from core node data

16. **Redundant Visited Checks**
    - Layout algorithms use visited sets suggesting possible cycles
    - Adds complexity for what should be a simple tree traversal
    - **Fix**: Enforce tree structure or document graph nature

## Testing

### Unit Tests

Tests in `test/mindmap.test.js` cover core functionality only. The test file imports `mindmap-core.js` directly and requires a Node.js environment with `assert` and a test framework (implied by `describe`/`beforeEach` usage, likely Mocha).

```bash
# Run the unit tests
npm test
```

### Local Development Server

To test the application in a browser:

```bash
# Serve the application locally (opens browser automatically)
npx http-server -o

# Or specify a port
npx http-server -p 8080 -o
```

The application will be available at `http://localhost:8080` (or the port you specified).

### Public URL with ngrok (for remote testing/sharing)

If you need to access the application from another device or share it with others, use ngrok to create a public tunnel:

1. **Install ngrok** (if not already installed):
   - Download from [ngrok.com](https://ngrok.com/download)
   - Or install via package manager:
     ```bash
     # macOS
     brew install ngrok

     # Linux (snap)
     snap install ngrok
     ```

2. **Start the local server first**:
   ```bash
   npx http-server -p 8080
   ```

3. **In a new terminal, start ngrok**:
   ```bash
   ngrok http 8080
   ```

4. **Get the public URL**:
   - ngrok will display output like:
     ```
     Forwarding   https://abc123.ngrok.io -> http://localhost:8080
     ```
   - Copy the `https://` URL (e.g., `https://abc123.ngrok.io`)
   - This URL is publicly accessible and can be used on any device

5. **Stop ngrok**: Press `Ctrl+C` in the ngrok terminal when done

**Note**: Free ngrok URLs are temporary and change each time you restart ngrok. For persistent URLs, you'll need a paid ngrok account.
