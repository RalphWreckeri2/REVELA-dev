const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const compDir = path.join(__dirname, 'src', 'components');

const replacements = [
  { pattern: /background:\s*["']?rgba\(255,255,255,0\.[9|8]\d?\)["']?/g, replace: 'background: "var(--color-modal-bg)"' },
  { pattern: /background:\s*["']?rgba\(255,255,255,0\.[7|6|5]\d?\)["']?/g, replace: 'background: "var(--color-input-bg)"' },
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
processDirectory(compDir);
console.log('Done cleaning high opacity whites');
