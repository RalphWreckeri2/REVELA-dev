const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const replacements = [
  { pattern: /"rgba\(248,249,250,0\.\d\)"/g, replace: '"var(--color-input-bg)"' },
  { pattern: /rgba\(248,249,250,0\.\d\)/g, replace: 'var(--color-input-bg)' },
  { pattern: /"rgba\(255,255,255,0\.\d\d?\)"/g, replace: '"var(--color-input-bg)"' },
  { pattern: /rgba\(255,255,255,0\.\d\d?\)/g, replace: 'var(--color-input-bg)' },
  { pattern: /"rgba\(239,246,255,0\.\d\)"/g, replace: '"var(--color-input-bg)"' },
  { pattern: /"rgba\(254,252,232,0\.\d\)"/g, replace: '"var(--color-input-bg)"' },
  { pattern: /"rgba\(240,253,244,0\.\d\)"/g, replace: '"var(--color-input-bg)"' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { pattern, replace } of replacements) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDirectory(pagesDir);
console.log('Done deep cleaning alpha colors');
