// Initialize MindMap Core
const mindMapCore = new MindMapCore();

// Initialize PixiJS Application
const app = new PIXI.Application({ 
    width: window.innerWidth, 
    height: window.innerHeight, 
    backgroundColor: 0x1099bb, 
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
document.getElementById('canvas-container').appendChild(app.view);

// Map to connect core node IDs with their UI representations
const nodeUIMap = new Map();
let lines = new PIXI.Graphics();
app.stage.addChild(lines);

let selectedNode = null;
let previousSelectedNode = null;
const baseNodeWidth = 150;

/**
 * Represents a single node in the mind map.
 * Extends PIXI.Graphics to draw the node's shape and handle interactions.
 */
class Node extends PIXI.Graphics {
    constructor(id, x, y, text = 'New Node') {
        super();
        this.nodeId = id;
        this.interactive = true;
        this.cursor = 'pointer';
        this.position.set(x, y);

        // Show both label and node ID
        this.label = text;
        this.text = new PIXI.Text(`${text} [${id}]`, { fontSize: 14, fill: 0xffffff });
        this.text.anchor.set(0.5);
        this.addChild(this.text);

        this._selected = false;
        this.draw();

        this.on('pointerdown', this.onDragStart);
        this.on('pointerup', this.onDragEnd);
        this.on('pointerupoutside', this.onDragEnd);
        this.on('pointermove', this.onDragMove);
        this.on('rightdown', this.onRightClick);
        this.on('pointerup', this.onSelect);
    }

    // Getter/setter for the selected state to automatically redraw on change

    set selected(value) {
        this._selected = value;
        this.draw();
    }

    get selected() {
        return this._selected;
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
     */
    onDragStart(event) {
        this.data = event.data;
        this.alpha = 0.5; // Make the node semi-transparent while dragging
        this.dragging = true;
        event.stopPropagation(); // Stop the event from bubbling up to the stage
    }

    /**
     * Handles the end of a drag operation.
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

    onDragMove() {
        if (this.dragging) {
            const newPosition = this.data.getLocalPosition(this.parent);
            this.x = newPosition.x;
            this.y = newPosition.y;
            updateLines();
        }
    }

    onRightClick(event) {
        mindMapCore.removeNode(this.nodeId);
        app.stage.removeChild(this);
        nodeUIMap.delete(this.nodeId);
        updateLines();
        event.stopPropagation();
    }

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

/**

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
        console.log(`Connecting parent ${parent.nodeId} to new node ${node.nodeId}`);
    } else {
        console.log('No selectedNode or previousSelectedNode, not connecting new node');
    }
    updateLines();
    return node;
}

function updateLines() {
    lines.clear();
    lines.lineStyle(2, 0xffffff);
    
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

// Make the main stage interactive to capture clicks on the background
app.stage.interactive = true;
app.stage.hitArea = app.screen;

// Variables to manage click vs. double-click detection

let dragStartPos = null;
let isPanning = false;

// --- Custom Double-Click Detection ---
let lastClickTime = 0;
let lastClickPos = null;
const DOUBLE_CLICK_DELAY = 350; // ms
const DOUBLE_CLICK_DIST = 10; // px

let doubleClickPending = false;


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

app.stage.on('pointerup', (event) => {
    const dragEndPos = event.data.global;
    let moveDistance = 0;
    
    if (dragStartPos) {
        const dx = dragEndPos.x - dragStartPos.x;
        const dy = dragEndPos.y - dragStartPos.y;
        moveDistance = Math.sqrt(dx * dx + dy * dy);
    }

    if (moveDistance < 5) { // It's a click
        if (event.target === app.stage) {
            // Only clear selectedNode if not a double-click (add node action)
            if (!doubleClickPending) {
                if (selectedNode) {
                    console.log('Pointerup on stage: clearing selectedNode');
                    previousSelectedNode = selectedNode;
                    selectedNode.selected = false;
                    selectedNode = null;
                } else {
                    console.log('Pointerup on stage: no selectedNode to clear');
                    previousSelectedNode = null;
                }
            } else {
                console.log('Pointerup on stage: skipping clear due to double-click/add node');
            }

            // Check for line click
            let lineClicked = false;
            const localPos = app.stage.toLocal(event.global);
            for (const [nodeIdA, nodeA] of mindMapCore.nodes) {
                const uiNodeA = nodeUIMap.get(nodeIdA);
                for (const toId of nodeA.connections) {
                    const uiNodeB = nodeUIMap.get(toId);
                    if (!uiNodeA || !uiNodeB) continue;
                    
                    const p = localPos;
                    const p1 = { x: uiNodeA.x, y: uiNodeA.y };
                    const p2 = { x: uiNodeB.x, y: uiNodeB.y };

                    const d = distToSegment(p, p1, p2);

                    if (d < 5) {
                        const newNode = addNode(p.x, p.y);
                        const index = nodeA.connections.indexOf(nodeB);
                        if (index > -1) {
                            mindMapCore.disconnect(nodeIdA, toId);
                        }
                        mindMapCore.connect(nodeIdA, newNode.nodeId);
                        mindMapCore.connect(newNode.nodeId, toId);
                        updateLines();
                        lineClicked = true;
                        break;
                    }
                }
                if (lineClicked) break;
            }
        }
    }
    isPanning = false;
    dragStartPos = null;
});

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


// Custom double-click handler
function handleDoubleClick(event) {
    const localPos = app.stage.toLocal(event.data.global);
    console.log('Double-click event:', event);
    console.log('selectedNode:', selectedNode ? `${selectedNode.label} [${selectedNode.nodeId}]` : null);
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


// --- UTILITY FUNCTIONS FOR LINE CLICK DETECTION ---

function dist2(v, w) {
    return (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
}

function distToSegmentSquared(p, v, w) {
    const l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

function distToSegment(p, v, w) {
    return Math.sqrt(distToSegmentSquared(p, v, w));
}


// --- ZOOM FUNCTIONALITY ---
app.view.addEventListener('wheel', (event) => {
    event.preventDefault(); // Prevent page from scrolling

    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1; // Zoom in or out

    // Get the mouse position relative to the stage
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const worldPos = app.stage.toLocal({x: mouseX, y: mouseY});

    // Apply the new scale
    app.stage.scale.x *= scaleFactor;
    app.stage.scale.y *= scaleFactor;

    // Adjust the stage position to keep the point under the mouse the same
    app.stage.x = mouseX - worldPos.x * app.stage.scale.x;
    app.stage.y = mouseY - worldPos.y * app.stage.scale.y;
});




// --- SAVE AND LOAD FUNCTIONALITY ---

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


// --- AUTO-LAYOUT FUNCTIONALITY ---

/**
 * Handles the 'Layout' button click.
 * Initiates the automatic layout process.
 */
document.getElementById('layout-button').addEventListener('click', () => {
    if (mindMapCore.nodes.size === 0) return;

    // Debug: Log all nodes and their connections
    console.log('--- MindMapCore Nodes ---');
    for (const [id, node] of mindMapCore.nodes) {
        console.log(`Node ${id}: text='${node.text}', connections=[${node.connections.join(', ')}]`);
    }

    // Debug: Log all child node IDs
    const childNodes = new Set();
    for (const [, node] of mindMapCore.nodes) {
        for (const childId of node.connections) {
            childNodes.add(childId);
        }
    }
    console.log('Child node IDs:', Array.from(childNodes));

    const rootId = mindMapCore.findRoot();
    console.log('Detected rootId:', rootId);
    if (!rootId) {
        console.error("Could not find a root node for the layout.");
        return;
    }

    mindMapCore.calculateSubtreeWidths(rootId, baseNodeWidth);
    mindMapCore.layoutTree(rootId, app.screen.width / 2, 50, mindMapCore.nodes.get(rootId).subtreeWidth);

    // Update UI nodes positions
    for (const [id, node] of mindMapCore.nodes) {
        const uiNode = nodeUIMap.get(id);
        if (uiNode) {
            uiNode.position.set(node.x, node.y);
        }
    }

    updateLines();
    resetView();
});

document.getElementById('horizontal-layout-button').addEventListener('click', () => {
    if (mindMapCore.nodes.size === 0) return;

    // Debug: Log all nodes and their connections
    console.log('--- MindMapCore Nodes ---');
    for (const [id, node] of mindMapCore.nodes) {
        console.log(`Node ${id}: text='${node.text}', connections=[${node.connections.join(', ')}]`);
    }

    // Debug: Log all child node IDs
    const childNodes = new Set();
    for (const [, node] of mindMapCore.nodes) {
        for (const childId of node.connections) {
            childNodes.add(childId);
        }
    }
    console.log('Child node IDs:', Array.from(childNodes));

    const rootId = mindMapCore.findRoot();
    console.log('Detected rootId:', rootId);
    if (!rootId) {
        console.error("Could not find a root node for the layout.");
        return;
    }

    mindMapCore.calculateSubtreeHeights(rootId, 100);
    mindMapCore.layoutTreeHorizontal(rootId, 50, app.screen.height / 2, mindMapCore.nodes.get(rootId).subtreeHeight);

    updateLines();
    resetView(); // Center the view after layout
});


/**
 * Resets the stage's position and scale to the default view.
 */
function resetView() {
    app.stage.x = 0;
    app.stage.y = 0;
    app.stage.scale.x = 1;
    app.stage.scale.y = 1;
}

// --- HELP DIALOG ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('help-button').addEventListener('click', () => {
        document.getElementById('help-dialog').classList.remove('hidden');
    });

    document.getElementById('close-help').addEventListener('click', () => {
        document.getElementById('help-dialog').classList.add('hidden');
    });
});
