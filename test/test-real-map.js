/**
 * Test with real user's map data that revealed the ID 0 bug
 */

const MindMapCore = require('../mindmap-core.js');

console.log('\n=== Testing Real Map Data (ID 0 Bug) ===\n');

const mindmap = new MindMapCore();

// Real map data from user
const mapData = {
  "nodes": [
    {"id": 0, "x": 340.8, "y": 385.6, "text": "Root", "connections": [1]},
    {"id": 1, "x": 388.0, "y": 491.2, "text": "New Node", "connections": [2, 5, 6]},
    {"id": 2, "x": 305.6, "y": 576.8, "text": "New Node", "connections": [3, 4]},
    {"id": 3, "x": 493.6, "y": 589.6, "text": "New Node", "connections": []},
    {"id": 4, "x": 531.2, "y": 533.6, "text": "New Node", "connections": []},
    {"id": 5, "x": 584.0, "y": 369.6, "text": "New Node", "connections": [7, 8]},
    {"id": 6, "x": 567.2, "y": 448.8, "text": "New Node", "connections": []},
    {"id": 7, "x": 481.6, "y": 352.8, "text": "New Node", "connections": []},
    {"id": 8, "x": 608.8, "y": 512.0, "text": "New Node", "connections": []}
  ]
};

// Load the map data
console.log('Loading map with 9 nodes...');
for (const nodeData of mapData.nodes) {
    mindmap.nextId = Math.max(mindmap.nextId, nodeData.id + 1);
    const id = mindmap.addNode(nodeData.text, nodeData.x, nodeData.y);
    // Override the ID to match loaded data
    if (id !== nodeData.id) {
        const node = mindmap.nodes.get(id);
        mindmap.nodes.delete(id);
        node.id = nodeData.id;
        mindmap.nodes.set(nodeData.id, node);
    }
}

// Add connections
for (const nodeData of mapData.nodes) {
    for (const toId of nodeData.connections) {
        mindmap.connect(nodeData.id, toId);
    }
}

console.log(`Loaded ${mindmap.nodes.size} nodes`);

// Test findRoot - this is where the bug was!
console.log('\nTesting findRoot() with ID 0:');
const rootId = mindmap.findRoot();
console.log(`  findRoot() returned: ${rootId} (type: ${typeof rootId})`);
console.log(`  Expected: 0`);

// This would have failed with old code: if (!rootId)
// Because !0 === true in JavaScript!
if (rootId !== 0) {
    console.error('  ❌ FAILED: Wrong root detected!');
    process.exit(1);
}
console.log('  ✓ Correct root found (ID 0)');

// Test vertical layout calculation
console.log('\nTesting vertical layout calculation:');
const baseWidth = 150;
mindmap.calculateSubtreeWidths(rootId, baseWidth);

const rootNode = mindmap.nodes.get(rootId);
console.log(`  Root subtreeWidth: ${rootNode.subtreeWidth}`);
console.log(`  Node 1 subtreeWidth: ${mindmap.nodes.get(1).subtreeWidth}`);
console.log(`  Node 2 subtreeWidth: ${mindmap.nodes.get(2).subtreeWidth}`);

if (typeof rootNode.subtreeWidth === 'undefined') {
    console.error('  ❌ FAILED: subtreeWidth is undefined!');
    process.exit(1);
}

console.log('  ✓ Layout calculation successful');

// Test that we can do a full layout
console.log('\nTesting full layout tree:');
mindmap.layoutTree(rootId, 400, 50, rootNode.subtreeWidth);

console.log(`  Root positioned at: (${rootNode.x}, ${rootNode.y})`);
console.log('  ✓ Full layout completed without errors');

console.log('\n✅ Real map data test PASSED!');
console.log('The ID 0 bug has been fixed!\n');
