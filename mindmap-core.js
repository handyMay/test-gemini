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
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        const node = this.nodes.get(nodeId);
        if (!node) return 0;

        const unvisitedChildren = node.connections.filter(id => !visited.has(id));
        if (unvisitedChildren.length === 0) {
            node.subtreeWidth = baseWidth;
            return baseWidth;
        }

        let childrenWidth = 0;
        for (const childId of unvisitedChildren) {
            childrenWidth += this.calculateSubtreeWidths(childId, baseWidth, visited);
        }

        node.subtreeWidth = Math.max(baseWidth, childrenWidth + (unvisitedChildren.length - 1) * 30);
        return node.subtreeWidth;
    }

    // Add the remaining layout functions similarly...
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindMapCore;
}
