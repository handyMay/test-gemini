// ============================================================================
// INITIALIZATION & GLOBAL STATE
// ============================================================================

/**
 * Initialize MindMap Core - the data model layer
 */
const mindMapCore = new MindMapCore();

/**
 * Initialize PixiJS Application - the rendering engine
 */
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
document.getElementById('canvas-container').appendChild(app.view);

/**
 * Map to connect core node IDs with their UI representations (PIXI.Graphics objects)
 * Key: node ID (number), Value: Node instance (PIXI.Graphics)
 */
const nodeUIMap = new Map();

/**
 * Global PIXI.Graphics object for drawing all connection lines
 */
let lines = new PIXI.Graphics();
app.stage.addChild(lines);

/**
 * Currently selected node (for creating connections)
 */
let selectedNode = null;

/**
 * Previously selected node (fallback for creating connections)
 */
let previousSelectedNode = null;

/**
 * Base width used for layout calculations
 */
const baseNodeWidth = 150;

// ============================================================================
// NODE CLASS - UI REPRESENTATION
// ============================================================================

/**
 * Represents a single node in the mind map.
 * Extends PIXI.Graphics to draw the node's shape and handle interactions.
 *
 * @class Node
 * @extends PIXI.Graphics
 */
class Node extends PIXI.Graphics {
    /**
     * Creates a new Node instance
     * @param {number} id - Unique identifier from MindMapCore
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {string} text - Display text for the node
     */
    constructor(id, x, y, text = 'New Node') {
        super();
        this.nodeId = id;
        this.interactive = true;
        this.cursor = 'pointer';
        this.position.set(x, y);

        // Store label separately for editing
        this.label = text;

        // Create text display (shows label + node ID for debugging)
        this.text = new PIXI.Text(`${text} [${id}]`, { fontSize: 14, fill: 0xffffff });
        this.text.anchor.set(0.5);
        this.addChild(this.text);

        // Selection state
        this._selected = false;
        this.draw();

        // Set up event handlers
        this.on('pointerdown', this.onDragStart);
        this.on('pointerup', this.onDragEnd);
        this.on('pointerupoutside', this.onDragEnd);
        this.on('pointermove', this.onDragMove);
        this.on('rightdown', this.onRightClick);
        this.on('pointerup', this.onSelect);
    }

    /**
     * Gets the selected state
     * @returns {boolean} True if node is selected
     */
    get selected() {
        return this._selected;
    }

    /**
     * Sets the selected state and triggers redraw
     * @param {boolean} value - New selected state
     */
    set selected(value) {
        this._selected = value;
        this.draw();
    }

    /**
     * Draws the node's visual representation (the rounded rectangle).
     * If the node is selected, it also draws a white border.
     */
    draw() {
        this.clear();
        if (this._selected) {
            this.lineStyle(2, 0xFFFFFF); // White border for selected node
        }
        const nodeWidth = 80;
        const nodeHeight = 40;
        const borderRadius = 10;

        this.beginFill(0xDE3249); // Red fill color
        this.drawRoundedRect(-nodeWidth / 2, -nodeHeight / 2, nodeWidth, nodeHeight, borderRadius);
        this.endFill();

        // Update label to always show text and node ID
        this.text.text = `${this.label} [${this.nodeId}]`;
        // Center the text within the node
        this.text.x = 0;
        this.text.y = 0;
    }

    /**
     * Handles the start of a drag operation on the node.
     * Makes node semi-transparent and stores drag data.
     * @param {PIXI.InteractionEvent} event - PixiJS pointer event
     */
    onDragStart(event) {
        this.data = event.data;
        this.alpha = 0.5; // Make the node semi-transparent while dragging
        this.dragging = true;
        event.stopPropagation(); // Stop the event from bubbling up to the stage
    }

    /**
     * Handles the end of a drag operation.
     * Restores opacity and updates core data model with new position.
     */
    onDragEnd() {
        this.alpha = 1;
        this.dragging = false;
        if (this.data) {
            const pos = this.data.getLocalPosition(this.parent);
            mindMapCore.updateNodePosition(this.nodeId, pos.x, pos.y);
        }
        this.data = null;
    }

    /**
     * Handles pointer move events during drag.
     * Updates node position and redraws connection lines (throttled for performance).
     */
    onDragMove() {
        if (this.dragging) {
            const newPosition = this.data.getLocalPosition(this.parent);
            this.x = newPosition.x;
            this.y = newPosition.y;
            updateLinesThrottled(); // Throttled to max 60fps
        }
    }

    /**
     * Handles right-click on node - deletes the node.
     * Removes from core data model, UI, and connection lines.
     * @param {PIXI.InteractionEvent} event - PixiJS pointer event
     */
    onRightClick(event) {
        mindMapCore.removeNode(this.nodeId);
        app.stage.removeChild(this);
        nodeUIMap.delete(this.nodeId);
        updateLines();
        event.stopPropagation();
    }

    /**
     * Handles node selection on pointer up.
     * Deselects previous node and selects this one.
     * @param {PIXI.InteractionEvent} event - PixiJS pointer event
     */
    onSelect(event) {
        if (selectedNode) {
            selectedNode.selected = false;
            previousSelectedNode = selectedNode;
        }
        selectedNode = this;
        this.selected = true;
        mindMapCore.selectedNodeId = this.nodeId;
    }
}

// ============================================================================
// NODE CREATION FUNCTIONS
// ============================================================================

/**
 * Adds a node to the core and UI without connecting it to any parent.
 * Use for root/standalone nodes (e.g., initial root, loading from file).
 * @param {number} x - The x-coordinate for the new node.
 * @param {number} y - The y-coordinate for the new node.
 * @param {string} text - The label for the new node.
 * @returns {Node} The newly created UI node.
 */
function addNode(x, y, text = 'New Node') {
    const id = mindMapCore.addNode(text, x, y);
    const node = new Node(id, x, y, text);
    app.stage.addChild(node);
    nodeUIMap.set(id, node);
    updateLines();
    return node;
}

/**
 * Creates a new node in the core and UI, and connects it to the selectedNode if present.
 * Use for UI-driven child node creation (double-click, keyboard, etc).
 * @param {number} x - The x-coordinate for the new node.
 * @param {number} y - The y-coordinate for the new node.
 * @param {string} text - The label for the new node.
 * @returns {Node} The newly created UI node.
 */
function createChildNodeAt(x, y, text = 'New Node') {
    const node = addNode(x, y, text);
    const parent = selectedNode || previousSelectedNode;
    if (parent) {
        mindMapCore.connect(parent.nodeId, node.nodeId);
    }
    updateLines();
    return node;
}

// ============================================================================
// LINE RENDERING
// ============================================================================

/**
 * Redraws all connection lines between nodes.
 * Clears the lines graphics object and redraws all connections from the core data model.
 * Use this for bulk operations (layout, load, etc).
 */
function updateLines() {
    lines.clear();
    lines.lineStyle(2, 0xffffff);

    // Iterate through all nodes in core and draw their connections
    for (const [fromId, fromNode] of mindMapCore.nodes) {
        const uiNodeFrom = nodeUIMap.get(fromId);
        for (const toId of fromNode.connections) {
            const uiNodeTo = nodeUIMap.get(toId);
            if (uiNodeFrom && uiNodeTo) {
                lines.moveTo(uiNodeFrom.x, uiNodeFrom.y);
                lines.lineTo(uiNodeTo.x, uiNodeTo.y);
            }
        }
    }
}

/**
 * Throttle state for line updates during dragging
 */
let lineUpdatePending = false;

/**
 * Throttled line update using requestAnimationFrame.
 * Ensures lines are only redrawn once per frame during dragging,
 * preventing performance issues when dragging nodes quickly.
 */
function updateLinesThrottled() {
    if (lineUpdatePending) return;

    lineUpdatePending = true;
    requestAnimationFrame(() => {
        updateLines();
        lineUpdatePending = false;
    });
}

// ============================================================================
// EVENT HANDLING - STAGE INTERACTIONS
// ============================================================================

// Make the main stage interactive to capture clicks on the background
app.stage.interactive = true;
app.stage.hitArea = app.screen;

/**
 * State variables for canvas panning/dragging
 */
let dragStartPos = null;
let isPanning = false;

/**
 * Custom double-click detection state
 * (PixiJS double-click detection is unreliable for our use case)
 */
let lastClickTime = 0;
let lastClickPos = null;
const DOUBLE_CLICK_DELAY = 350; // milliseconds
const DOUBLE_CLICK_DIST = 10;   // pixels
let doubleClickPending = false;

/**
 * Checks if a click position is near any connection line and inserts a node if found.
 * Uses bounding box optimization to reduce expensive distance calculations.
 *
 * Still O(n²) in worst case, but with early exits and bounding box checks.
 * TODO: Use spatial indexing (quadtree) for true O(log n) performance.
 *
 * @param {Object} localPos - Click position in local coordinates {x, y}
 * @returns {boolean} True if a line was clicked and node inserted
 */
function handleLineClick(localPos) {
    const LINE_CLICK_THRESHOLD = 5; // pixels
    const BOUNDING_BOX_MARGIN = 10; // Extra margin for bounding box check

    for (const [nodeIdA, nodeA] of mindMapCore.nodes) {
        const uiNodeA = nodeUIMap.get(nodeIdA);

        for (const toId of nodeA.connections) {
            const uiNodeB = nodeUIMap.get(toId);
            if (!uiNodeA || !uiNodeB) continue;

            const p = localPos;
            const p1 = { x: uiNodeA.x, y: uiNodeA.y };
            const p2 = { x: uiNodeB.x, y: uiNodeB.y };

            // Quick bounding box check - skip expensive distance calc if click is nowhere near line
            const minX = Math.min(p1.x, p2.x) - BOUNDING_BOX_MARGIN;
            const maxX = Math.max(p1.x, p2.x) + BOUNDING_BOX_MARGIN;
            const minY = Math.min(p1.y, p2.y) - BOUNDING_BOX_MARGIN;
            const maxY = Math.max(p1.y, p2.y) + BOUNDING_BOX_MARGIN;

            if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
                continue; // Click is outside bounding box, skip expensive distance calculation
            }

            // Now do the expensive distance calculation
            const distance = distToSegment(p, p1, p2);

            if (distance < LINE_CLICK_THRESHOLD) {
                // Create new node at click position
                const newNode = addNode(p.x, p.y);

                // Remove old connection and create two new ones through the new node
                mindMapCore.disconnect(nodeIdA, toId);
                mindMapCore.connect(nodeIdA, newNode.nodeId);
                mindMapCore.connect(newNode.nodeId, toId);

                updateLines();
                return true; // Early exit - we found and handled the click
            }
        }
    }
    return false;
}

/**
 * Handles pointer down events on the stage.
 * Initiates panning and custom double-click detection.
 */
app.stage.on('pointerdown', (event) => {
    dragStartPos = event.data.global.clone();
    if (event.target === app.stage) {
        isPanning = true;
    }

    // Custom double-click detection
    const now = Date.now();
    const pos = event.data.global;
    if (
        lastClickTime &&
        (now - lastClickTime < DOUBLE_CLICK_DELAY) &&
        lastClickPos &&
        Math.abs(pos.x - lastClickPos.x) < DOUBLE_CLICK_DIST &&
        Math.abs(pos.y - lastClickPos.y) < DOUBLE_CLICK_DIST
    ) {
        // Detected double-click
        doubleClickPending = true;
        handleDoubleClick(event);
        lastClickTime = 0;
        lastClickPos = null;
    } else {
        lastClickTime = now;
        lastClickPos = { x: pos.x, y: pos.y };
        doubleClickPending = false;
    }
});

/**
 * Handles pointer up events on the stage.
 * Determines if this was a click or drag, and handles node deselection and line clicks.
 */
app.stage.on('pointerup', (event) => {
    const dragEndPos = event.data.global;
    const CLICK_THRESHOLD = 5; // pixels - maximum movement to still be considered a click
    let moveDistance = 0;

    // Calculate how far the pointer moved since pointerdown
    if (dragStartPos) {
        const dx = dragEndPos.x - dragStartPos.x;
        const dy = dragEndPos.y - dragStartPos.y;
        moveDistance = Math.sqrt(dx * dx + dy * dy);
    }

    // Only process as a click if movement was minimal
    if (moveDistance < CLICK_THRESHOLD) {
        if (event.target === app.stage) {
            // Handle node deselection (clicking on empty canvas)
            if (!doubleClickPending) {
                if (selectedNode) {
                    previousSelectedNode = selectedNode;
                    selectedNode.selected = false;
                    selectedNode = null;
                } else {
                    previousSelectedNode = null;
                }
            }

            // Check if user clicked on a connection line
            const localPos = app.stage.toLocal(event.global);
            handleLineClick(localPos);
        }
    }

    // Reset panning state
    isPanning = false;
    dragStartPos = null;
});

/**
 * Handles pointer move events for canvas panning.
 * When panning is active (dragging canvas background), translates the entire stage.
 * NOTE: No throttling - fires on every mouse move. Could be optimized.
 */
app.stage.on('pointermove', (event) => {
    if (isPanning && dragStartPos) {
        const newPosition = event.data.global;
        const dx = newPosition.x - dragStartPos.x;
        const dy = newPosition.y - dragStartPos.y;
        app.stage.x += dx;
        app.stage.y += dy;
        dragStartPos = newPosition.clone();
    }
});

/**
 * Handles double-click events on the stage or nodes.
 * - On node: Creates text input for editing node label
 * - On canvas: Creates new child node connected to selected/previous node
 *
 * @param {PIXI.InteractionEvent} event - PixiJS pointer event
 */
function handleDoubleClick(event) {
    const localPos = app.stage.toLocal(event.data.global);
    if (event.target instanceof Node) {
        // Edit node text
        const node = event.target;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.label;
        input.style.position = 'absolute';
        const screenPos = node.getGlobalPosition();
        input.style.left = `${screenPos.x}px`;
        input.style.top = `${screenPos.y}px`;
        input.style.transform = 'translate(-50%, -50%)';
        input.style.width = `${node.text.width + 20}px`;
        document.getElementById('input-container').appendChild(input);

        input.focus();

        const onInputFinish = () => {
            node.label = input.value;
            node.draw();
            document.getElementById('input-container').removeChild(input);
        };

        input.addEventListener('blur', onInputFinish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                onInputFinish();
            }
        });
    } else {
        // Create new node with default text using the reusable function
        createChildNodeAt(localPos.x, localPos.y, 'New Node');
    }
}

// ============================================================================
// UTILITY FUNCTIONS - GEOMETRY
// ============================================================================

/**
 * Calculates squared distance between two points.
 * Used for distance comparisons without expensive sqrt operation.
 * @param {Object} v - First point {x, y}
 * @param {Object} w - Second point {x, y}
 * @returns {number} Squared distance
 */
function dist2(v, w) {
    return (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
}

/**
 * Calculates squared distance from a point to a line segment.
 * Uses projection to find closest point on segment.
 * @param {Object} p - Point to measure from {x, y}
 * @param {Object} v - Segment start point {x, y}
 * @param {Object} w - Segment end point {x, y}
 * @returns {number} Squared distance
 */
function distToSegmentSquared(p, v, w) {
    const l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v); // v and w are the same point

    // Project point p onto line segment, clamping to [0,1] to stay on segment
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

/**
 * Calculates distance from a point to a line segment.
 * Wrapper around distToSegmentSquared that returns actual distance.
 * @param {Object} p - Point to measure from {x, y}
 * @param {Object} v - Segment start point {x, y}
 * @param {Object} w - Segment end point {x, y}
 * @returns {number} Distance in pixels
 */
function distToSegment(p, v, w) {
    return Math.sqrt(distToSegmentSquared(p, v, w));
}

// ============================================================================
// ZOOM & PAN CONTROLS
// ============================================================================

/**
 * Handles mouse wheel events for zooming.
 * Implements zoom-to-cursor functionality: zooms toward/away from mouse position.
 * NOTE: No throttling - fires on every wheel event.
 */
app.view.addEventListener('wheel', (event) => {
    event.preventDefault(); // Prevent page from scrolling

    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1; // Zoom out / Zoom in

    // Get the mouse position relative to the stage coordinate system
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const worldPos = app.stage.toLocal({x: mouseX, y: mouseY});

    // Apply the new scale
    app.stage.scale.x *= scaleFactor;
    app.stage.scale.y *= scaleFactor;

    // Adjust the stage position to keep the point under the mouse stationary
    // This creates the "zoom to cursor" effect
    app.stage.x = mouseX - worldPos.x * app.stage.scale.x;
    app.stage.y = mouseY - worldPos.y * app.stage.scale.y;
});

// ============================================================================
// SAVE & LOAD FUNCTIONALITY
// ============================================================================

/**
 * Handles the 'Save' button click.
 * Serializes the mind map data to a JSON file and triggers a download.
 */
document.getElementById('save-button').addEventListener('click', () => {
    const data = {
        nodes: Array.from(mindMapCore.nodes.values()).map(node => ({
            id: node.id,
            x: node.x,
            y: node.y,
            text: node.text,
            connections: node.connections
        }))
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap.json';
    a.click();
    URL.revokeObjectURL(url);
});

/**
 * Handles the file selection for loading a mind map.
 * Reads the selected JSON file and reconstructs the mind map.
 * NOTE: No error handling - invalid JSON will throw uncaught error.
 */
document.getElementById('load-button').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        
        // Clear existing mind map
        for (const node of nodeUIMap.values()) {
            app.stage.removeChild(node);
        }
        nodeUIMap.clear();
        mindMapCore.nodes.clear();
        mindMapCore.nextId = 0;
        lines.clear();

        // Create nodes and connections
        for (const nodeData of data.nodes) {
            const node = addNode(nodeData.x, nodeData.y, nodeData.text);
            for (const toId of nodeData.connections) {
                mindMapCore.connect(node.nodeId, toId);
            }
        }
        updateLines();
    };
    reader.readAsText(file);
});

// Create the initial root node when the application starts
addNode(app.screen.width / 2, app.screen.height / 2, 'Root');

// ============================================================================
// AUTO-LAYOUT FUNCTIONALITY
// ============================================================================

/**
 * Resets the camera view to default position and zoom.
 * Called after layout operations to show the entire mind map.
 */
function resetView() {
    app.stage.x = 0;
    app.stage.y = 0;
    app.stage.scale.x = 1;
    app.stage.scale.y = 1;
}


/**
 * Handles the 'Vertical Layout' button click.
 * Arranges nodes in a top-down tree structure.
 * NOTE: Currently has issues with root node detection (see CLAUDE.md).
 */
document.getElementById('layout-button').addEventListener('click', () => {
    if (mindMapCore.nodes.size === 0) return;

    // Find root node of the tree
    const rootId = mindMapCore.findRoot();
    const rootNode = mindMapCore.nodes.get(rootId);

    if (!rootId || !rootNode) {
        console.error("Could not find a root node for the layout.");
        return;
    }

    // Calculate width needed for each subtree
    mindMapCore.calculateSubtreeWidths(rootId, baseNodeWidth);

    if (typeof rootNode.subtreeWidth === 'undefined') {
        console.error('Failed to calculate subtree widths for layout.');
        return;
    }

    // Position nodes based on calculated widths
    mindMapCore.layoutTree(rootId, app.screen.width / 2, 50, rootNode.subtreeWidth);

    // Update UI node positions to match core data
    for (const [id, node] of mindMapCore.nodes) {
        const uiNode = nodeUIMap.get(id);
        if (uiNode) {
            uiNode.position.set(node.x, node.y);
        }
    }

    updateLines();
    resetView();
});

/**
 * Handles the 'Horizontal Layout' button click.
 * Arranges nodes in a left-to-right tree structure.
 */
document.getElementById('horizontal-layout-button').addEventListener('click', () => {
    if (mindMapCore.nodes.size === 0) return;

    // Find root node of the tree
    const rootId = mindMapCore.findRoot();

    if (!rootId) {
        console.error("Could not find a root node for the layout.");
        return;
    }

    // Calculate height needed for each subtree
    mindMapCore.calculateSubtreeHeights(rootId, 100);

    // Position nodes based on calculated heights
    mindMapCore.layoutTreeHorizontal(
        rootId,
        50,
        app.screen.height / 2,
        mindMapCore.nodes.get(rootId).subtreeHeight
    );

    updateLines();
    resetView();
});

// ============================================================================
// HELP DIALOG
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('help-button').addEventListener('click', () => {
        document.getElementById('help-dialog').classList.remove('hidden');
    });

    document.getElementById('close-help').addEventListener('click', () => {
        document.getElementById('help-dialog').classList.add('hidden');
    });
});
