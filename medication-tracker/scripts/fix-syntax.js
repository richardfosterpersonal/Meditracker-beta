const fs = require('fs');
const path = require('path');

function fixSyntax(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fixSyntax(fullPath);
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
      
      fs.writeFileSync(fullPath, content);
    }
  });
}

const srcDir = path.join(__dirname, '../backend/src');
fixSyntax(srcDir);
