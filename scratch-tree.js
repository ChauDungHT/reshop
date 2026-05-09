const fs = require('fs');
const path = require('path');

const ignoreDirs = ['node_modules', 'dist', '.git', '.agent', 'prompt', 'uploads', '.gemini', '.tempmediaStorage', '.vscode', 'coverage', 'build'];
const ignoreFiles = ['.gitignore', 'scratch-tree.js', 'package-lock.json'];

function printTree(dir, prefix = '') {
  const items = fs.readdirSync(dir).filter(file => !ignoreDirs.includes(file) && !ignoreFiles.includes(file));
  
  items.forEach((file, index) => {
    const filePath = path.join(dir, file);
    const isLast = index === items.length - 1;
    const marker = isLast ? '└── ' : '├── ';
    
    try {
      const stats = fs.statSync(filePath);
      console.log(prefix + marker + file);
      
      if (stats.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        printTree(filePath, newPrefix);
      }
    } catch (e) {}
  });
}

console.log('reshop/');
printTree('.');
