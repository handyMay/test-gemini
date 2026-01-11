// ============================================================================
// MINDMAP CORE - DATA MODEL
// ============================================================================
// Pure data management layer with no UI dependencies.
// Manages nodes, connections, and layout calculations.
// All methods should be testable in isolation.
// ============================================================================

/**
 * Core data model for the mind map application.
 * Manages nodes, connections, and provides layout algorithms.
 * This class has no UI dependencies and can be tested independently.
 *
 * @class MindMapCore
 */
class MindMapCore {
    /**
     * Creates a new MindMapCore instance
     */
    constructor() {
        /** @type {Map<number, Object>} Map of node ID to node object */
        this.nodes = new Map();

        /** @type {number} Auto-incrementing ID for new nodes */
        this.nextId = 0;

        /** @type {number|null} Currently selected node ID (for UI synchronization) */
        this.selectedNodeId = null;
    }

    // ========================================================================
    // NODE MANAGEMENT
    // ========================================================================

    /**
     * Adds a new node to the mind map.
     * @param {string} text - Display text for the node
     * @param {number} x - Initial x coordinate
     * @param {number} y - Initial y coordinate
     * @returns {number} The ID of the newly created node
     */
    addNode(text, x, y) {
        const id = this.nextId++;
        const node = {
            id,
            text,
            x,
            y,
            connections: [],          // Array of child node IDs
            subtreeWidth: 0,          // Calculated during layout
            subtreeHeight: 0          // Calculated during layout
        };
        this.nodes.set(id, node);
        return id;
    }

    /**
     * Removes a node and all connections to/from it.
     * NOTE: This is O(n) complexity - scans all nodes to remove incoming connections.
     * TODO: Consider maintaining reverse connection map for O(1) removal.
     *
     * @param {number} id - ID of node to remove
     */
    removeNode(id) {
        const node = this.nodes.get(id);
        if (!node) return;

        // Remove all incoming connections (connections FROM other nodes TO this one)
        // This requires scanning all nodes - performance bottleneck
        for (const [, otherNode] of this.nodes) {
            otherNode.connections = otherNode.connections.filter(connId => connId !== id);
        }

        // Remove the node itself
        this.nodes.delete(id);

        // Clear selection if this node was selected
        if (this.selectedNodeId === id) {
            this.selectedNodeId = null;
        }
    }

    /**
     * Updates a node's position.
     * @param {number} id - Node ID
     * @param {number} x - New x coordinate
     * @param {number} y - New y coordinate
     */
    updateNodePosition(id, x, y) {
        const node = this.nodes.get(id);
        if (node) {
            node.x = x;
            node.y = y;
        }
    }

    /**
     * Updates a node's text label.
     * @param {number} id - Node ID
     * @param {string} text - New text content
     */
    updateNodeText(id, text) {
        const node = this.nodes.get(id);
        if (node) {
            node.text = text;
        }
    }

    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================

    /**
     * Creates a directed connection from one node to another (parent -> child).
     * NOTE: Does not prevent cycles - can create invalid tree structures.
     * TODO: Add cycle detection to maintain tree invariant.
     *
     * @param {number} fromId - Parent node ID
     * @param {number} toId - Child node ID
     */
    connect(fromId, toId) {
        const fromNode = this.nodes.get(fromId);
        if (fromNode && this.nodes.has(toId) && !fromNode.connections.includes(toId)) {
            fromNode.connections.push(toId);
        }
    }

    /**
     * Removes a connection between two nodes.
     * @param {number} fromId - Parent node ID
     * @param {number} toId - Child node ID
     */
    disconnect(fromId, toId) {
        const fromNode = this.nodes.get(fromId);
        if (fromNode) {
            fromNode.connections = fromNode.connections.filter(id => id !== toId);
        }
    }

    // ========================================================================
    // TREE ANALYSIS
    // ========================================================================

    /**
     * Finds the root node of the tree.
     * Root is defined as a node with no incoming connections.
     * NOTE: This is O(n) and called repeatedly - should be cached.
     * TODO: Cache root and invalidate when structure changes.
     *
     * @returns {number|null} Root node ID, or null if no nodes exist
     */
    findRoot() {
        // Build set of all nodes that are children of other nodes
        const childNodes = new Set();
        for (const [, node] of this.nodes) {
            for (const childId of node.connections) {
                childNodes.add(childId);
            }
        }

        // Find first node that is NOT a child of any other node
        for (const [id] of this.nodes) {
            if (!childNodes.has(id)) {
                return id;
            }
        }

        // Fallback: return first node if no clear root found
        return this.nodes.size > 0 ? this.nodes.keys().next().value : null;
    }

    // ========================================================================
    // LAYOUT ALGORITHMS
    // ========================================================================

    /**
     * Recursively calculates width needed for each subtree in vertical layout.
     * Bottom-up calculation: leaf nodes get baseWidth, parent widths are sum of children.
     * Stores result in node.subtreeWidth property.
     *
     * @param {number} nodeId - Node to calculate width for
     * @param {number} baseWidth - Base width for leaf nodes
     * @param {Set<number>} visited - Set of already-visited node IDs (prevents cycles)
     * @returns {number} Calculated width for this subtree
     */
    calculateSubtreeWidths(nodeId, baseWidth, visited = new Set()) {
        // Prevent infinite recursion if graph has cycles
        if (visited.has(nodeId)) {
            return 0;
        }
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) {
            return 0;
        }

        // Get children that haven't been visited yet
        const unvisitedChildren = node.connections.filter(id => !visited.has(id));

        // Leaf node: width is just the base width
        if (unvisitedChildren.length === 0) {
            node.subtreeWidth = baseWidth;
            return baseWidth;
        }

        // Internal node: width is sum of children widths plus spacing
        let childrenWidth = 0;
        for (const childId of unvisitedChildren) {
            childrenWidth += this.calculateSubtreeWidths(childId, baseWidth, visited);
        }

        const HORIZONTAL_SPACING = 30;
        node.subtreeWidth = Math.max(baseWidth, childrenWidth + (unvisitedChildren.length - 1) * HORIZONTAL_SPACING);

        return node.subtreeWidth;
    }

    /**
     * Recursively calculates height needed for each subtree in horizontal layout.
     * Similar to calculateSubtreeWidths but for horizontal tree layout.
     * Stores result in node.subtreeHeight property.
     *
     * @param {number} nodeId - Node to calculate height for
     * @param {number} baseHeight - Base height for leaf nodes
     * @param {Set<number>} visited - Set of already-visited node IDs (prevents cycles)
     * @returns {number} Calculated height for this subtree
     */
    calculateSubtreeHeights(nodeId, baseHeight, visited = new Set()) {
        // Prevent infinite recursion
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) return 0;

        // Get unvisited children
        const unvisitedChildren = node.connections.filter(id => !visited.has(id));

        // Leaf node
        if (unvisitedChildren.length === 0) {
            node.subtreeHeight = baseHeight;
            return baseHeight;
        }

        // Internal node: sum children heights
        let childrenHeight = 0;
        for (const childId of unvisitedChildren) {
            childrenHeight += this.calculateSubtreeHeights(childId, baseHeight, visited);
        }

        const VERTICAL_SPACING = 30;
        node.subtreeHeight = Math.max(baseHeight, childrenHeight + (unvisitedChildren.length - 1) * VERTICAL_SPACING);
        return node.subtreeHeight;
    }

    /**
     * Recursively positions nodes in a vertical (top-down) tree layout.
     * Requires calculateSubtreeWidths() to be called first.
     * Positions current node, then arranges children horizontally below it.
     *
     * @param {number} nodeId - Node to position
     * @param {number} x - X coordinate for this node
     * @param {number} y - Y coordinate for this node
     * @param {number} totalWidth - Total width allocated for this subtree
     * @param {Set<number>} visited - Set of already-visited node IDs (prevents cycles)
     */
    layoutTree(nodeId, x, y, totalWidth, visited = new Set()) {
        // Prevent infinite recursion
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) return;

        // Position this node
        node.x = x;
        node.y = y;

        // Get unvisited children
        const children = node.connections.filter(id => !visited.has(id));
        if (children.length === 0) return;

        // Position children horizontally below this node
        const VERTICAL_SPACING = 150;
        const HORIZONTAL_CHILD_SPACING = 30;
        let currentX = x - totalWidth / 2; // Start from left edge of allocated width

        for (const childId of children) {
            const childNode = this.nodes.get(childId);

            // Position child centered in its allocated width
            const childX = currentX + childNode.subtreeWidth / 2;
            const childY = y + VERTICAL_SPACING;

            // Recursively layout child's subtree
            this.layoutTree(childId, childX, childY, childNode.subtreeWidth, visited);

            // Move to next child's horizontal position
            currentX += childNode.subtreeWidth + HORIZONTAL_CHILD_SPACING;
        }
    }

    /**
     * Recursively positions nodes in a horizontal (left-to-right) tree layout.
     * Requires calculateSubtreeHeights() to be called first.
     * Positions current node, then arranges children vertically to the right.
     *
     * @param {number} nodeId - Node to position
     * @param {number} x - X coordinate for this node
     * @param {number} y - Y coordinate for this node
     * @param {number} totalHeight - Total height allocated for this subtree
     * @param {Set<number>} visited - Set of already-visited node IDs (prevents cycles)
     */
    layoutTreeHorizontal(nodeId, x, y, totalHeight, visited = new Set()) {
        // Prevent infinite recursion
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) return;

        // Position this node
        node.x = x;
        node.y = y;

        // Get unvisited children
        const children = node.connections.filter(id => !visited.has(id));
        if (children.length === 0) return;

        // Position children vertically to the right of this node
        const HORIZONTAL_SPACING = 200;
        const VERTICAL_CHILD_SPACING = 30;
        let currentY = y - totalHeight / 2; // Start from top edge of allocated height

        for (const childId of children) {
            const childNode = this.nodes.get(childId);

            // Position child centered in its allocated height
            const childY = currentY + childNode.subtreeHeight / 2;
            const childX = x + HORIZONTAL_SPACING;

            // Recursively layout child's subtree
            this.layoutTreeHorizontal(childId, childX, childY, childNode.subtreeHeight, visited);

            // Move to next child's vertical position
            currentY += childNode.subtreeHeight + VERTICAL_CHILD_SPACING;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindMapCore;
}
