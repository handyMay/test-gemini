// Initialize PixiJS Application
const app = new PIXI.Application({ 
    width: window.innerWidth, 
    height: window.innerHeight, 
    backgroundColor: 0x1099bb, 
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
document.getElementById('canvas-container').appendChild(app.view);

// Global variables to hold the state of the mind map
let nodes = []; // Array to store all node objects
let lines = new PIXI.Graphics(); // A single graphics object to draw all connection lines
app.stage.addChild(lines);

let selectedNode = null; // The currently selected node

// Base width for a single node, used in layout calculations
const baseNodeWidth = 150;

/**
 * Represents a single node in the mind map.
 * Extends PIXI.Graphics to draw the node's shape and handle interactions.
 */
class Node extends PIXI.Graphics {
    constructor(x, y, text = 'New Node') {
        super();
        this.interactive = true; // Enable interaction events for this node
        this.cursor = 'pointer'; // Show a pointer cursor on hover
        this.position.set(x, y);

        // Create the text label for the node
        this.text = new PIXI.Text(text, { fontSize: 14, fill: 0xffffff });
        this.text.anchor.set(0.5); // Center the text
        this.addChild(this.text);

        this._selected = false; // Internal state for selection
        this.draw(); // Initial drawing of the node

        // Event listeners for node interactions
        this.on('pointerdown', this.onDragStart);
        this.on('pointerup', this.onDragEnd);
        this.on('pointerupoutside', this.onDragEnd);
        this.on('pointermove', this.onDragMove);
        this.on('rightdown', this.onRightClick);
        this.on('pointerup', this.onSelect);

        this.connections = []; // Array to store references to connected nodes
        this.subtreeWidth = 0; // Used for the layout algorithm
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
        this.alpha = 1; // Restore full opacity
        this.dragging = false;
        this.data = null;
    }

    /**
     * Handles the movement during a drag operation.
     */
    onDragMove() {
        if (this.dragging) {
            const newPosition = this.data.getLocalPosition(this.parent);
            this.x = newPosition.x;
            this.y = newPosition.y;
            updateLines(); // Redraw connection lines as the node moves
        }
    }

    /**
     * Handles a right-click event to delete the node.
     */
    onRightClick(event) {
        const nodeToRemove = this;
        // Remove the node from the global nodes array
        const index = nodes.indexOf(nodeToRemove);
        if (index > -1) {
            nodes.splice(index, 1);
        }

        // Remove any connections to this node from other nodes
        for (const node of nodes) {
            const connectionIndex = node.connections.indexOf(nodeToRemove);
            if (connectionIndex > -1) {
                node.connections.splice(connectionIndex, 1);
            }
        }

        app.stage.removeChild(nodeToRemove); // Remove the node from the PixiJS stage
        updateLines(); // Redraw lines to reflect the removal
        event.stopPropagation(); // Prevent the stage from processing this event further
    }

    /**
     * Handles the selection of a node.
     */
    onSelect(event) {
        if (selectedNode) {
            selectedNode.selected = false; // Deselect the previously selected node
        }
        selectedNode = this;
        this.selected = true;
    }
}

/**
 * Creates a new node, adds it to the stage and the global nodes array.
 * @param {number} x - The x-coordinate for the new node.
 * @param {number} y - The y-coordinate for the new node.
 * @param {string} text - The initial text for the new node.
 * @returns {Node} The newly created node.
 */
function addNode(x, y, text) {
    const node = new Node(x, y, text);
    app.stage.addChild(node);
    nodes.push(node);
    return node;
}

/**
 * Redraws all connection lines between nodes.
 * This is called whenever a node is moved, added, or deleted.
 */
function updateLines() {
    lines.clear(); // Clear all previously drawn lines
    for (const node of nodes) {
        for (const connection of node.connections) {
            lines.lineStyle(2, 0xffffff); // White lines
            lines.moveTo(node.x, node.y);
            lines.lineTo(connection.x, connection.y);
        }
    }
}

// Make the main stage interactive to capture clicks on the background
app.stage.interactive = true;
app.stage.hitArea = app.screen;

// Variables to manage click vs. double-click detection
let lastClickTime = 0;
let lastClickPos = { x: 0, y: 0 };
let clickTimeout = null;

/**
 * This is the main event handler for all pointer down events on the stage.
 * It contains the logic to differentiate between single-clicks, double-clicks,
 * and clicks on different elements (nodes, lines, or the background).
 */
app.stage.on('pointerdown', onDragStart);
app.stage.on('pointerup', onDragEnd);
app.stage.on('pointerupoutside', onDragEnd);
app.stage.on('pointermove', onDragMove);

let stageDragging = false;
let lastPosition = null;

function onDragStart(event) {
    if (event.target === app.stage) {
        stageDragging = true;
        lastPosition = event.data.global.clone();
    }
}

function onDragEnd() {
    stageDragging = false;
    lastPosition = null;
}

function onDragMove(event) {
    if (stageDragging) {
        const newPosition = event.data.global;
        const dx = newPosition.x - lastPosition.x;
        const dy = newPosition.y - lastPosition.y;
        app.stage.x += dx;
        app.stage.y += dy;
        lastPosition = newPosition.clone();
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
        nodes: nodes.map(node => ({ x: node.x, y: node.y, text: node.text.text })),
        connections: [],
    };

    // Store connections using node indices
    for (let i = 0; i < nodes.length; i++) {
        for (const connection of nodes[i].connections) {
            const j = nodes.indexOf(connection);
            data.connections.push([i, j]);
        }
    }

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

        // Clear the existing mind map
        for (const node of nodes) {
            app.stage.removeChild(node);
        }
        nodes = [];
        lines.clear();

        // Create nodes from the loaded data
        for (const nodeData of data.nodes) {
            addNode(nodeData.x, nodeData.y, nodeData.text);
        }

        // Recreate connections based on the loaded data
        for (const connection of data.connections) {
            const [i, j] = connection;
            nodes[i].connections.push(nodes[j]);
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
    if (nodes.length === 0) return;

    const root = findRoot();
    if (!root) {
        console.error("Could not find a root node for the layout.");
        return;
    }

    // The layout algorithm is a two-pass process:
    // 1. Calculate the width of each subtree.
    const visitedForWidth = new Set();
    calculateSubtreeWidths(root, visitedForWidth);

    // 2. Position the nodes based on the calculated widths.
    const visitedForLayout = new Set();
    layoutTree(root, visitedForLayout, app.screen.width / 2, 50, root.subtreeWidth);

    updateLines();
    resetView(); // Center the view after layout
});

/**
 * Finds the root node of the mind map.
 * The root is a node that is not a child of any other node.
 * @returns {Node|null} The root node, or a fallback if no clear root is found.
 */
function findRoot() {
    const allNodes = new Set(nodes);
    // Remove any node that is a child from the set of potential roots
    for (const node of nodes) {
        for (const child of node.connections) {
            allNodes.delete(child);
        }
    }
    // If there's exactly one root, we found it.
    if (allNodes.size === 1) {
        return allNodes.values().next().value;
    }
    // Fallback for disconnected graphs, cycles, or single-node maps.
    if (nodes.length > 0) {
        console.warn("Mind map has multiple roots or is disconnected. Using the first node as the root for layout.");
        return nodes[0];
    }
    return null;
}

/**
 * Recursively calculates the horizontal space required for each node's subtree.
 * This is the first pass of the layout algorithm.
 * @param {Node} node - The current node to process.
 * @param {Set<Node>} visited - A set to keep track of visited nodes to avoid infinite loops in case of cycles.
 */
function calculateSubtreeWidths(node, visited) {
    if (visited.has(node)) return;
    visited.add(node);

    const unvisitedChildren = node.connections.filter(c => !visited.has(c));

    if (unvisitedChildren.length === 0) {
        node.subtreeWidth = baseNodeWidth; // A leaf node has a base width
        return;
    }

    let childrenWidth = 0;
    for (const child of unvisitedChildren) {
        calculateSubtreeWidths(child, visited);
        childrenWidth += child.subtreeWidth;
    }

    // The width of a subtree is the sum of its children's widths plus padding
    node.subtreeWidth = childrenWidth + (unvisitedChildren.length - 1) * 30; // 30px padding
    if (node.subtreeWidth < baseNodeWidth) {
        node.subtreeWidth = baseNodeWidth;
    }
}

/**
 * Recursively positions the nodes in a top-down tree layout.
 * This is the second pass of the layout algorithm.
 * @param {Node} node - The current node to position.
 * @param {Set<Node>} visited - A set to track visited nodes.
 * @param {number} x - The target x-coordinate for the current node.
 * @param {number} y - The target y-coordinate for the current node.
 * @param {number} totalWidth - The total width allocated for this node's subtree.
 */
function layoutTree(node, visited, x, y, totalWidth) {
    if (visited.has(node)) return;
    visited.add(node);

    node.x = x;
    node.y = y;

    const children = node.connections.filter(c => !visited.has(c));
    if (children.length === 0) return;

    const verticalSpacing = 150; // Space between parent and child levels

    // Start positioning children from the left edge of the allocated width
    let currentX = x - totalWidth / 2;

    for (const child of children) {
        const childSubtreeWidth = child.subtreeWidth;
        const childX = currentX + childSubtreeWidth / 2;
        const childY = y + verticalSpacing;
        
        layoutTree(child, visited, childX, childY, childSubtreeWidth);
        currentX += childSubtreeWidth + 30; // Move to the next child's position
    }
}

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
