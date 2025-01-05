const fs = require('fs');
const path = require('path');

function fixTypes(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fixTypes(fullPath);
    } else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix missing type declarations
      content = content.replace(/\b(\w+):\s*any\b/g, (match, p1) => {
        return `${p1}: unknown`;
      });
      
      // Fix missing return types
      content = content.replace(/async\s+(\w+)\s*\((.*?)\)\s*{/g, (match, name, params) => {
        if (!match.includes(':')) {
          return `async ${name}(${params}): Promise<void> {`;
        }
        return match;
      });
      
      // Fix missing parameter types
      content = content.replace(/\b(\w+)(?=\s*[,)])/g, (match, p1) => {
        if (p1 === 'void' || p1 === 'any' || p1 === 'string' || p1 === 'number' || p1 === 'boolean') {
          return match;
        }
        return `${p1}: unknown`;
      });
      
      // Fix Prisma client types
      content = content.replace(/PrismaClient<[^>]*>/g, 'PrismaClient');
      
      fs.writeFileSync(fullPath, content);
    }
  });
}

const srcDir = path.join(__dirname, '../backend/src');
fixTypes(srcDir);
