/**
 * Test that mimics the actual UI flow with selectedNode/previousSelectedNode
 */

const MindMapCore = require('../mindmap-core.js');

console.log('\n=== Testing UI Flow (previousSelectedNode pattern) ===\n');

const mindmap = new MindMapCore();

// Simulate the app's initialization
console.log('1. App starts, creates initial root node');
const rootId = mindmap.addNode('Root', 400, 300);
console.log(`   Created root: ${rootId}`);

// Simulate user double-clicking with root selected
console.log('\n2. User double-clicks canvas with root selected');
const child1Id = mindmap.addNode('New Node', 350, 400);
mindmap.connect(rootId, child1Id);  // selectedNode was root
console.log(`   Created child1: ${child1Id}, connected to root`);

// Simulate user double-clicking again with child1 selected
console.log('\n3. User double-clicks canvas with child1 selected');
const child2Id = mindmap.addNode('New Node', 450, 400);
mindmap.connect(child1Id, child2Id);  // selectedNode was child1
console.log(`   Created child2: ${child2Id}, connected to child1`);

// Now we have: Root -> Child1 -> Child2 (a chain)
console.log('\n4. User clicks "Vertical Layout" button');

// Test findRoot
const foundRoot = mindmap.findRoot();
console.log(`   findRoot() returned: ${foundRoot}`);
console.log(`   Expected root: ${rootId}`);

if (foundRoot !== rootId) {
    console.error(`   ❌ BUG: Wrong root! Expected ${rootId}, got ${foundRoot}`);
    console.error('   This is the root detection bug!');
    process.exit(1);
}

console.log(`   ✓ Correct root found`);

// Test calculateSubtreeWidths
console.log('\n5. Calculating subtree widths...');
const baseWidth = 150;
mindmap.calculateSubtreeWidths(foundRoot, baseWidth);

const rootNode = mindmap.nodes.get(foundRoot);
console.log(`   Root subtreeWidth: ${rootNode.subtreeWidth}`);
console.log(`   Child1 subtreeWidth: ${mindmap.nodes.get(child1Id).subtreeWidth}`);
console.log(`   Child2 subtreeWidth: ${mindmap.nodes.get(child2Id).subtreeWidth}`);

if (typeof rootNode.subtreeWidth === 'undefined') {
    console.error('\n❌ BUG: root.subtreeWidth is undefined!');
    process.exit(1);
}

console.log('\n✓ Vertical layout would work correctly!');

// Now test what happens if user creates a NEW root by double-clicking empty space
console.log('\n6. User deselects all and double-clicks empty space');
const newNodeId = mindmap.addNode('Orphan Node', 600, 300);
// No connection because no selectedNode or previousSelectedNode
console.log(`   Created orphan node: ${newNodeId} (not connected to anything)`);

console.log('\n7. Now we have TWO roots - test findRoot again');
const foundRoot2 = mindmap.findRoot();
console.log(`   findRoot() returned: ${foundRoot2}`);
console.log(`   Note: With multiple roots, it returns the first root found`);

// Try to layout - should still work but only layout one tree
mindmap.calculateSubtreeWidths(foundRoot2, baseWidth);
const foundRootNode = mindmap.nodes.get(foundRoot2);

if (typeof foundRootNode.subtreeWidth === 'undefined') {
    console.error('\n❌ BUG: subtreeWidth undefined with multiple roots!');
    process.exit(1);
}

console.log('   ✓ Layout works even with multiple disconnected trees');

console.log('\n✓✓✓ All UI flow tests passed! Vertical layout is working.\n');
