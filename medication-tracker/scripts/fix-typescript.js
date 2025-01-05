const fs = require('fs');
const path = require('path');

function fixTypeScript(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fixTypeScript(fullPath);
    } else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix missing commas in object literals and array literals
      content = content.replace(/(\w+)\s*\n\s*(\w+):/g, '$1,\n  $2:');
      content = content.replace(/(\w+)\s*\n\s*\]/g, '$1,\n]');
      
      // Fix missing parentheses in function declarations
      content = content.replace(/(\w+)\s*=>\s*{/g, '$1) => {');
      
      // Fix missing semicolons
      content = content.replace(/(\w+)\s*\n/g, '$1;\n');
      
      // Fix type declarations
      content = content.replace(/(\w+)\s*:\s*(\w+)\s*([,}])/g, '$1: $2$3');
      
      // Fix import statements
      content = content.replace(/import\s*{([^}]+)}\s*from/g, (match, imports) => {
        const fixedImports = imports.split(',')
          .map(i => i.trim())
          .filter(i => i)
          .join(', ');
        return `import { ${fixedImports} } from`;
      });
      
      // Fix export statements
      content = content.replace(/export\s*{([^}]+)}/g, (match, exports) => {
        const fixedExports = exports.split(',')
          .map(e => e.trim())
          .filter(e => e)
          .join(', ');
        return `export { ${fixedExports} }`;
      });
      
      // Fix function parameters
      content = content.replace(/function\s+(\w+)\s*\((.*?)\)/g, (match, name, params) => {
        const fixedParams = params.split(',')
          .map(p => p.trim())
          .filter(p => p)
          .join(', ');
        return `function ${name}(${fixedParams})`;
      });
      
      // Fix class declarations
      content = content.replace(/class\s+(\w+)\s*{/g, 'class $1 {');
      
      // Fix interface declarations
      content = content.replace(/interface\s+(\w+)\s*{/g, 'interface $1 {');
      
      // Fix type aliases
      content = content.replace(/type\s+(\w+)\s*=/g, 'type $1 =');
      
      fs.writeFileSync(fullPath, content);
    }
  });
}

const srcDir = path.join(__dirname, '../backend/src');
fixTypeScript(srcDir);
