const fs = require('fs');
const path = require('path');

function fixImports(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fixImports(fullPath);
    } else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix relative imports
      content = content.replace(/from ['"]\.\.?\/(.*?)['"]/g, (match, p1) => {
        if (!p1.endsWith('.js')) {
          return `from '../${p1}.js'`;
        }
        return match;
      });
      
      // Fix package imports
      content = content.replace(/from ['"](@\w+\/[\w-]+|[\w-]+)['"]/g, (match, p1) => {
        return match;
      });
      
      fs.writeFileSync(fullPath, content);
    }
  });
}

const srcDir = path.join(__dirname, '../backend/src');
fixImports(srcDir);
