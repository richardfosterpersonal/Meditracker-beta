/**
 * Validation Dependencies Graph
 * 
 * This tool helps visualize and manage validation dependencies to prevent circular logic.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationNode {
    id: string;
    dependencies: string[];
    isProtected: boolean;
}

class ValidationGraph {
    private nodes: Map<string, ValidationNode> = new Map();
    private protectedPaths: Set<string> = new Set();

    constructor() {
        // Load protected paths from validation check
        const validationCheckPath = path.join(process.cwd(), 'scripts', 'validation_check.ts');
        if (fs.existsSync(validationCheckPath)) {
            const content = fs.readFileSync(validationCheckPath, 'utf8');
            const match = content.match(/SELF_MAINTENANCE_PATHS\s*=\s*\[([\s\S]*?)\]/);
            if (match) {
                const paths = match[1].split(',')
                    .map(p => p.trim().replace(/['"]/g, ''))
                    .filter(p => p);
                paths.forEach(p => this.protectedPaths.add(p));
            }
        }
    }

    addNode(id: string, dependencies: string[] = []) {
        this.nodes.set(id, {
            id,
            dependencies,
            isProtected: this.protectedPaths.has(id)
        });
    }

    detectCycles(): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const dfs = (nodeId: string, path: string[] = []): void => {
            if (recursionStack.has(nodeId)) {
                const cycle = path.slice(path.indexOf(nodeId));
                cycles.push(cycle);
                return;
            }

            if (visited.has(nodeId)) return;

            visited.add(nodeId);
            recursionStack.add(nodeId);

            const node = this.nodes.get(nodeId);
            if (node) {
                for (const dep of node.dependencies) {
                    dfs(dep, [...path, nodeId]);
                }
            }

            recursionStack.delete(nodeId);
        };

        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                dfs(nodeId);
            }
        }

        return cycles;
    }

    generateReport(): string {
        let report = '# Validation Dependencies Report\n\n';

        // Check for cycles
        const cycles = this.detectCycles();
        if (cycles.length > 0) {
            report += '## ⚠️ Circular Dependencies Detected\n\n';
            cycles.forEach((cycle, i) => {
                report += `### Cycle ${i + 1}\n`;
                report += cycle.join(' → ') + ' → ' + cycle[0] + '\n\n';
            });
        }

        // List protected paths
        report += '## Protected Paths\n\n';
        this.protectedPaths.forEach(path => {
            report += `- ${path}\n`;
        });

        // Dependency tree
        report += '\n## Dependency Tree\n\n';
        this.nodes.forEach(node => {
            report += `### ${node.id}${node.isProtected ? ' (Protected)' : ''}\n`;
            if (node.dependencies.length > 0) {
                report += 'Dependencies:\n';
                node.dependencies.forEach(dep => {
                    report += `- ${dep}\n`;
                });
            } else {
                report += 'No dependencies\n';
            }
            report += '\n';
        });

        return report;
    }

    saveReport(outputPath: string = 'docs/validation/dependencies.md'): void {
        const report = this.generateReport();
        fs.writeFileSync(outputPath, report);
    }
}

// Generate initial graph
const graph = new ValidationGraph();

// Add core validation components
graph.addNode('scripts/validation_check.ts', [
    'docs/VALIDATION_CHECKPOINTS.md',
    '.validation-config.json'
]);

graph.addNode('docs/VALIDATION_CHECKPOINTS.md', [
    'docs/validation/2024-12-24_comprehensive_validation.md'
]);

graph.addNode('docs/VALIDATION_OVERRIDE.md', [
    'scripts/validation_check.ts'
]);

// Generate and save report
graph.saveReport();

console.log('Validation dependencies analysis complete');
console.log('See docs/validation/dependencies.md for the report');
