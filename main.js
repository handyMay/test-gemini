const app = new PIXI.Application({ 
    width: window.innerWidth, 
    height: window.innerHeight, 
    backgroundColor: 0x1099bb, 
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
document.getElementById('canvas-container').appendChild(app.view);

let nodes = [];
let lines = new PIXI.Graphics();
app.stage.addChild(lines);

let selectedNode = null;

const baseNodeWidth = 150; // Approximate width needed for a single node

class Node extends PIXI.Graphics {
    constructor(x, y, text = 'New Node') {
        super();
        this.interactive = true;
        this.cursor = 'pointer';
        this.position.set(x, y);
        this.text = new PIXI.Text(text, { fontSize: 14, fill: 0xffffff });
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
        this.connections = [];
        this.subtreeWidth = 0;
    }

    set selected(value) {
        this._selected = value;
        this.draw();
    }

    get selected() {
        return this._selected;
    }

    draw() {
        this.clear();
        if (this._selected) {
            this.lineStyle(2, 0xFFFFFF);
        }
        const nodeWidth = 80;
        const nodeHeight = 40;
        const borderRadius = 10;

        this.beginFill(0xDE3249);
        this.drawRoundedRect(-nodeWidth / 2, -nodeHeight / 2, nodeWidth, nodeHeight, borderRadius);
        this.endFill();

        // Adjust text position if needed (though 0.5 anchor should still center it)
        this.text.x = 0;
        this.text.y = 0;
    }

    onDragStart(event) {
        this.data = event.data;
        this.alpha = 0.5;
        this.dragging = true;
        // No stopPropagation here, let stage handle it for selection/double-click
    }

    onDragEnd() {
        this.alpha = 1;
        this.dragging = false;
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
        console.log(`Right-click on node: ${this.text.text}`);
        const nodeToRemove = this;
        const index = nodes.indexOf(nodeToRemove);
        if (index > -1) {
            nodes.splice(index, 1);
        }

        for (const node of nodes) {
            const connectionIndex = node.connections.indexOf(nodeToRemove);
            if (connectionIndex > -1) {
                node.connections.splice(connectionIndex, 1);
            }
        }

        app.stage.removeChild(nodeToRemove);
        updateLines();
        event.stopPropagation(); // Prevent stage from deselecting
    }

    onSelect(event) {
        console.log(`Node selected: ${this.text.text}`);
        if (selectedNode) {
            selectedNode.selected = false;
        }
        selectedNode = this;
        this.selected = true;
    }
}

function addNode(x, y, text) {
    const node = new Node(x, y, text);
    app.stage.addChild(node);
    nodes.push(node);
    console.log(`Node added: ${text} at (${x}, ${y})`);
    return node;
}

function updateLines() {
    lines.clear();
    for (const node of nodes) {
        for (const connection of node.connections) {
            lines.lineStyle(2, 0xffffff);
            lines.moveTo(node.x, node.y);
            lines.lineTo(connection.x, connection.y);
        }
    }
}

app.stage.interactive = true;
app.stage.hitArea = app.screen;

let lastClickTime = 0;
let lastClickPos = { x: 0, y: 0 };
let clickTimeout = null;

app.stage.on('pointerdown', (event) => {
    console.log("Stage pointerdown event fired. Target:", event.target);

    const clickTime = Date.now();
    const clickPos = event.global;
    const localPos = app.stage.toLocal(clickPos);

    const isDoubleClick = (clickTime - lastClickTime < 300 && Math.abs(clickPos.x - lastClickPos.x) < 10 && Math.abs(clickPos.y - lastClickPos.y) < 10);

    if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
    }

    if (isDoubleClick) {
        console.log("Double click detected.");
        if (event.target instanceof Node) {
            const node = event.target;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = node.text.text;
            input.style.position = 'absolute';
            const screenPos = node.getGlobalPosition();
            input.style.left = `${screenPos.x}px`;
            input.style.top = `${screenPos.y}px`;
            input.style.transform = 'translate(-50%, -50%)';
            input.style.width = `${node.text.width + 20}px`;
            document.getElementById('input-container').appendChild(input);

            input.focus();

            const onInputFinish = () => {
                node.text.text = input.value;
                document.getElementById('input-container').removeChild(input);
            };

            input.addEventListener('blur', onInputFinish);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    onInputFinish();
                }
            });
        } else {
            console.log("Double-click on canvas background.");
            // Double-click on canvas background: create new node (child of selected or new root)
            const newNode = addNode(localPos.x, localPos.y);
            if (selectedNode) {
                selectedNode.connections.push(newNode);
                console.log(`Connected new node to selected node: ${selectedNode.text.text}`);
            } else {
                console.log("No node selected, new node is a root.");
            }
            updateLines();
        }
        // Reset lastClickTime to prevent triple-clicks or accidental double-clicks
        lastClickTime = 0;
    } else {
        // This is a potential single click or the first click of a double click
        lastClickTime = clickTime;
        lastClickPos = clickPos;

        clickTimeout = setTimeout(() => {
            console.log("Single click processed after delay.");
            // If the click was NOT directly on the stage (i.e., it was on a child object like a Node),
            // then we let the child object's handlers manage the event.
            if (event.target !== app.stage) {
                console.log("Click was on a child object, stage will not handle this event.");
                return; // Exit early if a child object was clicked
            }

            console.log("Single click on canvas background detected.");
            // Single click on canvas background: deselect node
            if (selectedNode) {
                console.log(`Deselecting node: ${selectedNode.text.text}`);
                selectedNode.selected = false;
                selectedNode = null;
            }

            // Check for line click to insert a node
            let lineClicked = false;
            for (const nodeA of nodes) {
                for (const nodeB of nodeA.connections) {
                    const p = localPos;
                    const p1 = { x: nodeA.x, y: nodeA.y };
                    const p2 = { x: nodeB.x, y: nodeB.y };

                    const d = distToSegment(p, p1, p2);

                    if (d < 5) {
                        console.log(`Line click detected between ${nodeA.text.text} and ${nodeB.text.text}`);
                        const newNode = addNode(p.x, p.y);
                        const index = nodeA.connections.indexOf(nodeB);
                        if (index > -1) {
                            nodeA.connections.splice(index, 1);
                            console.log(`Removed connection from ${nodeA.text.text} to ${nodeB.text.text}`);
                        }
                        nodeA.connections.push(newNode);
                        newNode.connections.push(nodeB);
                        console.log(`Inserted new node between ${nodeA.text.text} and ${nodeB.text.text}`);
                        updateLines();
                        lineClicked = true;
                        break;
                    }
                }
                if (lineClicked) break;
            }
        }, 300); // 300ms delay for single click
    }
});

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


// Zoom
app.view.addEventListener('wheel', (event) => {
    event.preventDefault(); // Prevent page scrolling

    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;

    // Get mouse position in stage coordinates
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    const worldX = (mouseX - app.stage.x) / app.stage.scale.x;
    const worldY = (mouseY - app.stage.y) / app.stage.scale.y;

    // Apply scale
    app.stage.scale.x *= scaleFactor;
    app.stage.scale.y *= scaleFactor;

    // Adjust stage position to keep the world point under the mouse
    app.stage.x = mouseX - worldX * app.stage.scale.x;
    app.stage.y = mouseY - worldY * app.stage.scale.y;
});

// Pan
let dragging = false;
let prevX, prevY;
app.view.addEventListener('mousedown', (event) => {
    if (event.target === app.view) {
        dragging = true;
        prevX = event.clientX;
        prevY = event.clientY;
    }
});
app.view.addEventListener('mouseup', () => {
    dragging = false;
});
app.view.addEventListener('mousemove', (event) => {
    if (dragging) {
        const dx = event.clientX - prevX;
        const dy = event.clientY - prevY;
        app.stage.x += dx;
        app.stage.y += dy;
        prevX = event.clientX;
        prevY = event.clientY;
    }
});


document.getElementById('save-button').addEventListener('click', () => {
    const data = {
        nodes: nodes.map(node => ({ x: node.x, y: node.y, text: node.text.text })),
        connections: [],
    };

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

document.getElementById('load-button').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);

        // Clear existing nodes
        for (const node of nodes) {
            app.stage.removeChild(node);
        }
        nodes = [];
        lines.clear();

        // Add new nodes
        for (const nodeData of data.nodes) {
            addNode(nodeData.x, nodeData.y, nodeData.text);
        }

        // Add connections
        for (const connection of data.connections) {
            const [i, j] = connection;
            nodes[i].connections.push(nodes[j]);
        }
        updateLines();
    };
    reader.readAsText(file);
});

// Initial node
addNode(app.screen.width / 2, app.screen.height / 2, 'Root');


document.getElementById('layout-button').addEventListener('click', () => {
    console.log("Layout button clicked.");
    if (nodes.length === 0) {
        console.log("No nodes to layout.");
        return;
    }

    const root = findRoot();
    if (!root) {
        console.error("Could not find a root node for the layout.");
        return;
    }
    console.log("Root node for layout:", root.text.text);

    const visitedForWidth = new Set();
    calculateSubtreeWidths(root, visitedForWidth);

    const visitedForLayout = new Set();
    layoutTree(root, visitedForLayout, app.screen.width / 2, 50, root.subtreeWidth);

    updateLines();
    resetView(); // Reset view after layout
    console.log("Layout complete.");
});

function findRoot() {
    const allNodes = new Set(nodes);
    for (const node of nodes) {
        for (const child of node.connections) {
            allNodes.delete(child);
        }
    }
    if (allNodes.size === 0 && nodes.length > 0) {
        console.log("No root found, but nodes exist. Returning first node as fallback.");
        return nodes[0]; // Fallback for single node or cycles
    }
    if (allNodes.size !== 1) {
        console.warn("Mind map has multiple roots or is disconnected. Using the first node as the root for layout.");
        return nodes[0];
    }
    console.log("Found single root:", allNodes.values().next().value.text.text);
    return allNodes.values().next().value;
}

function calculateSubtreeWidths(node, visited) {
    if (visited.has(node)) {
        return;
    }
    visited.add(node);

    let childrenWidth = 0;
    const unvisitedChildren = node.connections.filter(c => !visited.has(c));

    if (unvisitedChildren.length === 0) {
        node.subtreeWidth = baseNodeWidth;
        return;
    }

    for (const child of unvisitedChildren) {
        calculateSubtreeWidths(child, visited);
        childrenWidth += child.subtreeWidth;
    }

    // Add some padding between children
    node.subtreeWidth = childrenWidth + (unvisitedChildren.length - 1) * 30; // 30px padding between children
    if (node.subtreeWidth < baseNodeWidth) {
        node.subtreeWidth = baseNodeWidth;
    }
}

function layoutTree(node, visited, x, y, totalWidth) {
    console.log(`layoutTree: Node=${node.text.text}, x=${x}, y=${y}, totalWidth=${totalWidth}`);
    if (visited.has(node)) {
        console.log(`layoutTree: Node ${node.text.text} already visited.`);
        return;
    }
    visited.add(node);

    node.x = x;
    node.y = y;
    console.log(`layoutTree: Setting node ${node.text.text} position to (${node.x}, ${node.y})`);

    const children = node.connections.filter(c => !visited.has(c));
    const childCount = children.length;
    console.log(`layoutTree: Node ${node.text.text} has ${childCount} unvisited children.`);
    if (childCount === 0) {
        return;
    }

    const verticalSpacing = 150; // Increased vertical spacing

    let currentX = x - totalWidth / 2;

    for (let i = 0; i < childCount; i++) {
        const child = children[i];
        const childSubtreeWidth = child.subtreeWidth;
        
        const childX = currentX + childSubtreeWidth / 2;
        const childY = y + verticalSpacing;
        
        console.log(`layoutTree: Recursing for child ${child.text.text} with x=${childX}, y=${childY}, subtreeWidth=${childSubtreeWidth}`);
        layoutTree(child, visited, childX, childY, childSubtreeWidth);
        currentX += childSubtreeWidth;
    }
}

function resetView() {
    app.stage.x = 0;
    app.stage.y = 0;
    app.stage.scale.x = 1;
    app.stage.scale.y = 1;
    console.log("View reset.");
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('help-button').addEventListener('click', () => {
        document.getElementById('help-dialog').classList.remove('hidden');
    });

    document.getElementById('close-help').addEventListener('click', () => {
        document.getElementById('help-dialog').classList.add('hidden');
    });
});