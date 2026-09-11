import fs from 'fs';
import path from 'path';

const lucideExports = [
  'Calendar', 'Users', 'LayoutGrid', 'Eye', 'ArrowLeftRight', 'Clock', 'FileCheck2',
  'BarChart3', 'History', 'Cloud', 'User', 'LogOut', 'CheckCircle2', 'RotateCw',
  'KeyRound', 'Scale', 'Sliders', 'ShieldCheck', 'Zap', 'HeartHandshake', 'AlertTriangle',
  'Check', 'ChevronLeft', 'ChevronRight', 'Download', 'Edit', 'Plus', 'RefreshCw', 'Save',
  'Search', 'Trash2', 'Upload', 'X', 'FileText', 'SlidersHorizontal', 'CheckCircle'
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('src');
let hasError = false;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  // check lucide import
  const match = code.match(/from\s*['"]lucide-react['"]/);
  if (match) {
    // extract imported items
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
    let m;
    const importedIcons = new Set();
    while ((m = importRegex.exec(code)) !== null) {
      m[1].split(',').forEach(item => {
        const name = item.trim().split(/\s+as\s+/)[0].trim();
        if (name) importedIcons.add(name);
      });
    }
    
    // now search for icons used in JSX like <IconName or icon: IconName
    for (const icon of lucideExports) {
      // regex to check if icon is used as identifier
      const usedRegex = new RegExp(`\\b${icon}\\b`);
      if (usedRegex.test(code.replace(/import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"]/g, ''))) {
        if (!importedIcons.has(icon)) {
          console.error(`[MISSING IMPORT] In ${f}: ${icon} is used but not imported from lucide-react!`);
          hasError = true;
        }
      }
    }
  }
}

if (!hasError) {
  console.log('ALL LUCIDE ICONS ARE PROPERLY IMPORTED!');
} else {
  process.exit(1);
}
