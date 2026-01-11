/**
 * Simple test runner without external dependencies
 * Tests core mindmap functionality after refactoring
 */

const assert = require('assert');
const MindMapCore = require('../mindmap-core.js');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        testsPassed++;
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);
        testsFailed++;
    }
}

// Run tests
console.log('\nRunning MindMap Core Tests...\n');

test('should create nodes', () => {
    const mindmap = new MindMapCore();
    const nodeId = mindmap.addNode('Test', 100, 100);
    assert.equal(mindmap.nodes.get(nodeId).text, 'Test');
    assert.equal(mindmap.nodes.get(nodeId).x, 100);
    assert.equal(mindmap.nodes.get(nodeId).y, 100);
});

test('should connect nodes', () => {
    const mindmap = new MindMapCore();
    const node1 = mindmap.addNode('Parent', 0, 0);
    const node2 = mindmap.addNode('Child', 100, 100);
    mindmap.connect(node1, node2);
    assert.deepEqual(mindmap.nodes.get(node1).connections, [node2]);
});

test('should find root node', () => {
    const mindmap = new MindMapCore();
    const root = mindmap.addNode('Root', 0, 0);
    const child = mindmap.addNode('Child', 100, 100);
    mindmap.connect(root, child);
    assert.equal(mindmap.findRoot(), root);
});

test('should remove nodes and their connections', () => {
    const mindmap = new MindMapCore();
    const root = mindmap.addNode('Root', 0, 0);
    const child = mindmap.addNode('Child', 100, 100);
    mindmap.connect(root, child);
    mindmap.removeNode(child);
    assert.equal(mindmap.nodes.get(root).connections.length, 0);
    assert.equal(mindmap.nodes.has(child), false);
});

test('should calculate subtree widths', () => {
    const mindmap = new MindMapCore();
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

test('should disconnect nodes', () => {
    const mindmap = new MindMapCore();
    const node1 = mindmap.addNode('Parent', 0, 0);
    const node2 = mindmap.addNode('Child', 100, 100);
    mindmap.connect(node1, node2);
    mindmap.disconnect(node1, node2);
    assert.equal(mindmap.nodes.get(node1).connections.length, 0);
});

test('should update node position', () => {
    const mindmap = new MindMapCore();
    const nodeId = mindmap.addNode('Test', 100, 100);
    mindmap.updateNodePosition(nodeId, 200, 200);
    assert.equal(mindmap.nodes.get(nodeId).x, 200);
    assert.equal(mindmap.nodes.get(nodeId).y, 200);
});

test('should update node text', () => {
    const mindmap = new MindMapCore();
    const nodeId = mindmap.addNode('Test', 100, 100);
    mindmap.updateNodeText(nodeId, 'Updated');
    assert.equal(mindmap.nodes.get(nodeId).text, 'Updated');
});

// Summary
console.log(`\n${testsPassed + testsFailed} tests total`);
console.log(`${testsPassed} passed`);
console.log(`${testsFailed} failed\n`);

process.exit(testsFailed > 0 ? 1 : 0);
