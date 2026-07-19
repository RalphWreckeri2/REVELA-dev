const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const replacements = [
  { pattern: /marker:\s*["']#ef4444["'],\s*bg:\s*["']#fee2e2["'],\s*text:\s*["']#b91c1c["']/g, replace: 'marker: "#ef4444", bg: "var(--flag-red-bg)", text: "var(--flag-red-text)"' },
  { pattern: /marker:\s*["']#f59e0b["'],\s*bg:\s*["']#fef3c7["'],\s*text:\s*["']#92400e["']/g, replace: 'marker: "#f59e0b", bg: "var(--flag-yellow-bg)", text: "var(--flag-yellow-text)"' },
  { pattern: /marker:\s*["']#e65100["'],\s*bg:\s*["']#fff3e0["'],\s*text:\s*["']#bf360c["']/g, replace: 'marker: "#e65100", bg: "var(--flag-orange-bg)", text: "var(--flag-orange-text)"' },
  { pattern: /marker:\s*["']#000000["'],\s*bg:\s*["']#1e1e1e22["'],\s*text:\s*["']#1a1a1a["']/g, replace: 'marker: "#000000", bg: "var(--flag-black-bg)", text: "var(--flag-black-text)"' },
  { pattern: /marker:\s*["']#22c55e["'],\s*bg:\s*["']#dcfce7["'],\s*text:\s*["']#15803d["']/g, replace: 'marker: "#22c55e", bg: "var(--flag-green-bg)", text: "var(--flag-green-text)"' },
  { pattern: /marker:\s*["']#94a3b8["'],\s*bg:\s*["']#f1f5f9["'],\s*text:\s*["']#64748b["']/g, replace: 'marker: "#94a3b8", bg: "var(--flag-default-bg)", text: "var(--flag-default-text)"' },
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
console.log('Done replacing flag colors with CSS variables');
