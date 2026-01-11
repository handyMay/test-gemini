/**
 * Test edge cases that might break vertical layout
 */

const MindMapCore = require('../mindmap-core.js');

function testCase(name, fn) {
    try {
        console.log(`\n=== ${name} ===`);
        fn();
        console.log('✓ Passed');
    } catch (error) {
        console.error(`✗ Failed: ${error.message}`);
        throw error;
    }
}

// Test Case 1: Multiple roots (disconnected nodes)
testCase('Multiple disconnected nodes', () => {
    const mindmap = new MindMapCore();
    const node1 = mindmap.addNode('Node1', 100, 100);
    const node2 = mindmap.addNode('Node2', 200, 200);
    const node3 = mindmap.addNode('Node3', 300, 300);

    // No connections - all are roots
    const root = mindmap.findRoot();
    console.log(`  Found root: ${root} (should be first node: ${node1})`);

    mindmap.calculateSubtreeWidths(root, 150);
    const rootNode = mindmap.nodes.get(root);

    if (typeof rootNode.subtreeWidth === 'undefined') {
        throw new Error('subtreeWidth is undefined for disconnected nodes');
    }
    console.log(`  Root subtreeWidth: ${rootNode.subtreeWidth}`);
});

// Test Case 2: Chain (A -> B -> C)
testCase('Linear chain of nodes', () => {
    const mindmap = new MindMapCore();
    const nodeA = mindmap.addNode('A', 100, 100);
    const nodeB = mindmap.addNode('B', 200, 200);
    const nodeC = mindmap.addNode('C', 300, 300);

    mindmap.connect(nodeA, nodeB);
    mindmap.connect(nodeB, nodeC);

    const root = mindmap.findRoot();
    console.log(`  Found root: ${root} (should be A: ${nodeA})`);

    mindmap.calculateSubtreeWidths(root, 150);
    const rootNode = mindmap.nodes.get(root);

    if (typeof rootNode.subtreeWidth === 'undefined') {
        throw new Error('subtreeWidth is undefined for chain');
    }
    console.log(`  Root subtreeWidth: ${rootNode.subtreeWidth}`);
});

// Test Case 3: Created in reverse order (like user might do)
testCase('Nodes created and connected in reverse', () => {
    const mindmap = new MindMapCore();

    // Create child first, then parent (unusual but possible)
    const child = mindmap.addNode('Child', 200, 200);
    const parent = mindmap.addNode('Parent', 100, 100);

    // Connect parent to child
    mindmap.connect(parent, child);

    const root = mindmap.findRoot();
    console.log(`  Found root: ${root} (should be parent: ${parent})`);

    if (root !== parent) {
        throw new Error(`Found wrong root: ${root}, expected ${parent}`);
    }

    mindmap.calculateSubtreeWidths(root, 150);
    const rootNode = mindmap.nodes.get(root);

    if (typeof rootNode.subtreeWidth === 'undefined') {
        throw new Error('subtreeWidth is undefined when created in reverse order');
    }
    console.log(`  Root subtreeWidth: ${rootNode.subtreeWidth}`);
});

// Test Case 4: Complex tree
testCase('Complex tree structure', () => {
    const mindmap = new MindMapCore();

    const root = mindmap.addNode('Root', 400, 100);
    const child1 = mindmap.addNode('C1', 200, 200);
    const child2 = mindmap.addNode('C2', 400, 200);
    const child3 = mindmap.addNode('C3', 600, 200);
    const grandchild1 = mindmap.addNode('GC1', 150, 300);
    const grandchild2 = mindmap.addNode('GC2', 250, 300);

    mindmap.connect(root, child1);
    mindmap.connect(root, child2);
    mindmap.connect(root, child3);
    mindmap.connect(child1, grandchild1);
    mindmap.connect(child1, grandchild2);

    const foundRoot = mindmap.findRoot();
    console.log(`  Found root: ${foundRoot} (should be ${root})`);

    mindmap.calculateSubtreeWidths(foundRoot, 150);
    const rootNode = mindmap.nodes.get(foundRoot);

    if (typeof rootNode.subtreeWidth === 'undefined') {
        throw new Error('subtreeWidth is undefined for complex tree');
    }
    console.log(`  Root subtreeWidth: ${rootNode.subtreeWidth}`);
    console.log(`  Child1 (has children) subtreeWidth: ${mindmap.nodes.get(child1).subtreeWidth}`);
});

// Test Case 5: Simulating actual app flow
testCase('Simulating actual app usage', () => {
    const mindmap = new MindMapCore();

    // Initial root node
    const root = mindmap.addNode('Root', 400, 300);

    // User double-clicks to create child
    const child1 = mindmap.addNode('New Node', 350, 400);
    mindmap.connect(root, child1);

    // User creates another child
    const child2 = mindmap.addNode('New Node', 450, 400);
    mindmap.connect(root, child2);

    // User clicks layout button
    const foundRoot = mindmap.findRoot();
    console.log(`  Found root: ${foundRoot} (should be ${root})`);

    if (foundRoot !== root) {
        throw new Error(`Wrong root detected! Found ${foundRoot}, expected ${root}`);
    }

    const returnedWidth = mindmap.calculateSubtreeWidths(foundRoot, 150);
    console.log(`  calculateSubtreeWidths returned: ${returnedWidth}`);

    const rootNode = mindmap.nodes.get(foundRoot);
    console.log(`  Root node subtreeWidth: ${rootNode.subtreeWidth}`);

    if (typeof rootNode.subtreeWidth === 'undefined') {
        throw new Error('subtreeWidth is undefined - BUG REPRODUCED!');
    }

    if (rootNode.subtreeWidth !== returnedWidth) {
        throw new Error(`Mismatch: node.subtreeWidth=${rootNode.subtreeWidth}, returned=${returnedWidth}`);
    }
});

console.log('\n✓ All edge case tests passed!\n');
