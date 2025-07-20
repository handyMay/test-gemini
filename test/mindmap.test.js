const assert = require('assert');
const MindMapCore = require('./mindmap-core.js');

describe('MindMap Core', () => {
    let mindmap;

    beforeEach(() => {
        mindmap = new MindMapCore();
    });

    it('should create nodes', () => {
        const nodeId = mindmap.addNode('Test', 100, 100);
        assert.equal(mindmap.nodes.get(nodeId).text, 'Test');
        assert.equal(mindmap.nodes.get(nodeId).x, 100);
        assert.equal(mindmap.nodes.get(nodeId).y, 100);
    });

    it('should connect nodes', () => {
        const node1 = mindmap.addNode('Parent', 0, 0);
        const node2 = mindmap.addNode('Child', 100, 100);
        mindmap.connect(node1, node2);
        assert.deepEqual(mindmap.nodes.get(node1).connections, [node2]);
    });

    it('should find root node', () => {
        const root = mindmap.addNode('Root', 0, 0);
        const child = mindmap.addNode('Child', 100, 100);
        mindmap.connect(root, child);
        assert.equal(mindmap.findRoot(), root);
    });

    it('should remove nodes and their connections', () => {
        const root = mindmap.addNode('Root', 0, 0);
        const child = mindmap.addNode('Child', 100, 100);
        mindmap.connect(root, child);
        mindmap.removeNode(child);
        assert.equal(mindmap.nodes.get(root).connections.length, 0);
        assert.equal(mindmap.nodes.has(child), false);
    });

    it('should calculate subtree widths', () => {
        const root = mindmap.addNode('Root', 0, 0);
        const child1 = mindmap.addNode('Child1', 100, 100);
        const child2 = mindmap.addNode('Child2', 200, 100);
        mindmap.connect(root, child1);
        mindmap.connect(root, child2);
        
        const baseWidth = 150;
        mindmap.calculateSubtreeWidths(root, baseWidth);
        
        assert.ok(mindmap.nodes.get(root).subtreeWidth >= baseWidth);
        assert.equal(mindmap.nodes.get(child1).subtreeWidth, baseWidth);
        assert.equal(mindmap.nodes.get(child2).subtreeWidth, baseWidth);
    });
});
