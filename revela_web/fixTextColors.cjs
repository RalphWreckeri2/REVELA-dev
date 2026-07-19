const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const replacements = [
  // Text colors
  { pattern: /"#1a202c"/g, replace: '"var(--color-ink)"' },
  { pattern: /"#1e293b"/g, replace: '"var(--color-ink)"' },
  { pattern: /"#334155"/g, replace: '"var(--color-ink)"' },
  { pattern: /"#475569"/g, replace: '"var(--color-muted)"' },
  { pattern: /"#64748b"/g, replace: '"var(--color-muted)"' },
  { pattern: /"#94a3b8"/g, replace: '"var(--color-muted)"' },
  // Chart axis text
  { pattern: /fill: "#64748b"/g, replace: 'fill: "var(--color-muted)"' },
  { pattern: /fill: "#1a202c"/g, replace: 'fill: "var(--color-ink)"' },
  // specific glass backgrounds
  { pattern: /"rgba\(254,242,242,0\.6\)"/g, replace: '"var(--color-hover)"' },
  { pattern: /"rgba\(243,232,255,0\.6\)"/g, replace: '"var(--color-hover)"' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
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
console.log('Done replacing hardcoded text colors and glass backgrounds');
