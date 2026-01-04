class MindMapCore {
    constructor() {
        this.nodes = new Map();
        this.nextId = 0;
        this.selectedNodeId = null;
    }

    addNode(text, x, y) {
        const id = this.nextId++;
        const node = {
            id,
            text,
            x,
            y,
            connections: [],
            subtreeWidth: 0,
            subtreeHeight: 0
        };
        this.nodes.set(id, node);
        return id;
    }

    removeNode(id) {
        const node = this.nodes.get(id);
        if (!node) return;

        // Remove connections to this node
        for (const [, otherNode] of this.nodes) {
            otherNode.connections = otherNode.connections.filter(connId => connId !== id);
        }
        
        this.nodes.delete(id);
        if (this.selectedNodeId === id) {
            this.selectedNodeId = null;
        }
    }

    connect(fromId, toId) {
        const fromNode = this.nodes.get(fromId);
        if (fromNode && this.nodes.has(toId) && !fromNode.connections.includes(toId)) {
            fromNode.connections.push(toId);
        }
    }

    disconnect(fromId, toId) {
        const fromNode = this.nodes.get(fromId);
        if (fromNode) {
            fromNode.connections = fromNode.connections.filter(id => id !== toId);
        }
    }

    updateNodePosition(id, x, y) {
        const node = this.nodes.get(id);
        if (node) {
            node.x = x;
            node.y = y;
        }
    }

    updateNodeText(id, text) {
        const node = this.nodes.get(id);
        if (node) {
            node.text = text;
        }
    }

    findRoot() {
        const childNodes = new Set();
        for (const [, node] of this.nodes) {
            for (const childId of node.connections) {
                childNodes.add(childId);
            }
        }

        for (const [id, node] of this.nodes) {
            if (!childNodes.has(id)) {
                return id;
            }
        }

        // Fallback: return first node
        return this.nodes.size > 0 ? this.nodes.keys().next().value : null;
    }

    calculateSubtreeWidths(nodeId, baseWidth, visited = new Set()) {
        console.log(`[calculateSubtreeWidths] called for nodeId: ${nodeId}, baseWidth: ${baseWidth}`);
        // Use existing node variable, add log after width calculation
        // ...existing code...
        // After width calculation, log node
        if (node) {
            console.log(`[calculateSubtreeWidths] After calculation, node:`, node);
        }
        if (visited.has(nodeId)) {
            console.log(`[calculateSubtreeWidths] Already visited node ${nodeId}`);
            return 0;
        }
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) {
            console.log(`[calculateSubtreeWidths] Node ${nodeId} not found`);
            return 0;
        }

        const unvisitedChildren = node.connections.filter(id => !visited.has(id));
        console.log(`[calculateSubtreeWidths] Node ${nodeId} (${node.text}), children:`, unvisitedChildren);
        if (unvisitedChildren.length === 0) {
            node.subtreeWidth = baseWidth;
            console.log(`[calculateSubtreeWidths] Leaf node ${nodeId} (${node.text}), subtreeWidth set to baseWidth: ${baseWidth}`);
            return baseWidth;
        }

        let childrenWidth = 0;
        for (const childId of unvisitedChildren) {
            childrenWidth += this.calculateSubtreeWidths(childId, baseWidth, visited);
        }

        node.subtreeWidth = Math.max(baseWidth, childrenWidth + (unvisitedChildren.length - 1) * 30);
        console.log(`[calculateSubtreeWidths] Node ${nodeId} (${node.text}), computed subtreeWidth: ${node.subtreeWidth}`);
        return node.subtreeWidth;
    }

    calculateSubtreeHeights(nodeId, baseHeight, visited = new Set()) {
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) return 0;

        const unvisitedChildren = node.connections.filter(id => !visited.has(id));
        if (unvisitedChildren.length === 0) {
            node.subtreeHeight = baseHeight;
            return baseHeight;
        }

        let childrenHeight = 0;
        for (const childId of unvisitedChildren) {
            childrenHeight += this.calculateSubtreeHeights(childId, baseHeight, visited);
        }

        node.subtreeHeight = Math.max(baseHeight, childrenHeight + (unvisitedChildren.length - 1) * 30);
        return node.subtreeHeight;
    }

    layoutTree(nodeId, x, y, totalWidth, visited = new Set()) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) return;

        node.x = x;
        node.y = y;

        const children = node.connections.filter(id => !visited.has(id));
        if (children.length === 0) return;

        const verticalSpacing = 150;
        let currentX = x - totalWidth / 2;

        for (const childId of children) {
            const childNode = this.nodes.get(childId);
            const childX = currentX + childNode.subtreeWidth / 2;
            const childY = y + verticalSpacing;
            
            this.layoutTree(childId, childX, childY, childNode.subtreeWidth, visited);
            currentX += childNode.subtreeWidth + 30;
        }
    }

    layoutTreeHorizontal(nodeId, x, y, totalHeight, visited = new Set()) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) return;

        node.x = x;
        node.y = y;

        const children = node.connections.filter(id => !visited.has(id));
        if (children.length === 0) return;

        const horizontalSpacing = 200;
        let currentY = y - totalHeight / 2;

        for (const childId of children) {
            const childNode = this.nodes.get(childId);
            const childY = currentY + childNode.subtreeHeight / 2;
            const childX = x + horizontalSpacing;

            this.layoutTreeHorizontal(childId, childX, childY, childNode.subtreeHeight, visited);
            currentY += childNode.subtreeHeight + 30;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindMapCore;
}
