# Mind Mapping Software

This is a simple, web-based mind mapping application built with PixiJS.

## Entry Point

The entry point of the application is the `index.html` file. When this file is opened in a web browser, it loads the necessary HTML structure, the PixiJS library from a CDN, and finally the `main.js` script. The execution of the application's logic begins as soon as `main.js` is loaded and parsed by the browser.

## Logic Flow

The logic within `main.js` is divided into two main phases: **Initialization** and **User Interaction**.

### 1. Initialization Phase

This phase happens immediately when the script is executed.

1.  **Create PixiJS App:** A new PixiJS application instance is created, and its view (an HTML `<canvas>` element) is appended to the `<div id="canvas-container">` in the HTML.
2.  **Initialize State Variables:** Global variables are created to manage the state of the mind map:
    *   `nodes = []`: An array to store all the node objects.
    *   `lines = new PIXI.Graphics()`: A single PixiJS graphics object used to draw all connection lines.
    *   `selectedNode = null`: A variable to keep track of the currently selected node.
3.  **Add Initial Node:** The `addNode()` function is called to create the first "Root" node in the center of the screen.
4.  **Set Up Event Listeners:** The application sets up various event listeners to handle user input, making the application interactive. This includes listeners for:
    *   The "Save", "Load", "Layout", and "Help" buttons.
    *   A primary listener on the main stage (`app.stage.on('pointerdown', ...)`), which handles all clicks and double-clicks on the canvas.
    *   Listeners on the canvas view for mouse wheel events (zooming) and mouse drag events (panning).

At the end of this phase, the application is fully loaded, displays a single "Root" node, and is ready to respond to user actions.

### 2. User Interaction (Event-Driven Flow)

After initialization, the application's flow is driven entirely by user events.

1.  **The Main Click Handler (`app.stage.on('pointerdown', ...)`):** This is the core of the user interaction logic. It uses a `setTimeout` to differentiate between a single-click and a double-click.
    *   **On a double-click:**
        *   If the target is a `Node`, it creates an HTML `<input>` field over the node to allow text editing.
        *   If the target is the canvas background, it creates a new node. If another node is selected, it connects the new node to it.
    *   **On a single-click:**
        *   If the target is a `Node`, it selects that node.
        *   If the target is a line between two nodes, it "inserts" a new node by splitting the connection.
        *   If the target is the canvas background, it deselects any currently selected node.

2.  **Other Interactions:**
    *   **Dragging a Node:** The `onDragStart`, `onDragMove`, and `onDragEnd` methods in the `Node` class handle moving a node, with `updateLines()` redrawing connections.
    *   **Right-Clicking a Node:** The `onRightClick` method deletes the node and its connections.
    *   **Using Buttons:** The "Save", "Load", and "Layout" buttons trigger their respective functions to manage the mind map's state and appearance.
