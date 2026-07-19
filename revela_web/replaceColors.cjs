const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const compDir = path.join(__dirname, 'src', 'components');

const replacements = [
  { pattern: /background:\s*["']#ffffff["']/gi, replace: 'background: "var(--color-modal-bg)"' },
  { pattern: /background:\s*["']#fff["']/gi, replace: 'background: "var(--color-modal-bg)"' },
  { pattern: /background:\s*["']white["']/gi, replace: 'background: "var(--color-modal-bg)"' },
  { pattern: /background:\s*["']#f8fafc["']/gi, replace: 'background: "var(--color-card-alt)"' },
  { pattern: /background:\s*["']#f1f5f9["']/gi, replace: 'background: "var(--color-surface)"' },
  { pattern: /color:\s*["']#334155["']/gi, replace: 'color: "var(--color-ink)"' },
  { pattern: /color:\s*["']#475569["']/gi, replace: 'color: "var(--color-muted)"' },
  { pattern: /color:\s*["']#1e293b["']/gi, replace: 'color: "var(--color-ink)"' },
  { pattern: /color:\s*["']#0f172a["']/gi, replace: 'color: "var(--color-ink)"' },
  { pattern: /color:\s*["']#64748b["']/gi, replace: 'color: "var(--color-muted)"' },
  { pattern: /border:\s*["']1px solid #e2e8f0["']/gi, replace: 'border: "1px solid var(--color-border)"' },
  { pattern: /border:\s*["']1px solid #cbd5e1["']/gi, replace: 'border: "1px solid var(--color-border)"' },
  { pattern: /borderBottom:\s*["']1px solid #e2e8f0["']/gi, replace: 'borderBottom: "1px solid var(--color-border)"' },
  { pattern: /borderTop:\s*["']1px solid #e2e8f0["']/gi, replace: 'borderTop: "1px solid var(--color-border)"' },
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
console.log('Done');
