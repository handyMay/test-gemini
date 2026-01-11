/**
 * Test to reproduce vertical layout bug
 */

const MindMapCore = require('../mindmap-core.js');

console.log('\n=== Testing Vertical Layout Bug ===\n');

// Create a simple tree structure
const mindmap = new MindMapCore();

// Create root and children like the app would
const root = mindmap.addNode('Root', 400, 300);
const child1 = mindmap.addNode('Child 1', 300, 400);
const child2 = mindmap.addNode('Child 2', 500, 400);

// Connect them
mindmap.connect(root, child1);
mindmap.connect(root, child2);

console.log('Created nodes:');
console.log(`  Root: ${root}`);
console.log(`  Child1: ${child1}`);
console.log(`  Child2: ${child2}`);

// Test findRoot()
console.log('\nTesting findRoot():');
const foundRoot = mindmap.findRoot();
console.log(`  Found root ID: ${foundRoot}`);
console.log(`  Expected root ID: ${root}`);
console.log(`  Match: ${foundRoot === root}`);

// Test calculateSubtreeWidths()
console.log('\nTesting calculateSubtreeWidths():');
const baseWidth = 150;
console.log(`  Calling calculateSubtreeWidths(${foundRoot}, ${baseWidth})`);

const returnedWidth = mindmap.calculateSubtreeWidths(foundRoot, baseWidth);
console.log(`  Returned width: ${returnedWidth}`);

const rootNode = mindmap.nodes.get(foundRoot);
console.log(`  Root node subtreeWidth: ${rootNode.subtreeWidth}`);
console.log(`  Child1 subtreeWidth: ${mindmap.nodes.get(child1).subtreeWidth}`);
console.log(`  Child2 subtreeWidth: ${mindmap.nodes.get(child2).subtreeWidth}`);

// Check if subtreeWidth is properly set
if (typeof rootNode.subtreeWidth === 'undefined') {
    console.error('\n❌ BUG FOUND: rootNode.subtreeWidth is undefined!');
    process.exit(1);
} else {
    console.log('\n✓ Vertical layout calculation works correctly');
    console.log(`  Root can be laid out with width: ${rootNode.subtreeWidth}`);
    process.exit(0);
}
