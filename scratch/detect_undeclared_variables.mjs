// scratch/detect_undeclared_variables.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const STANDARD_GLOBALS = new Set([
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'Error',
  'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'encodeURIComponent',
  'decodeURI', 'decodeURIComponent', 'fetch', 'alert', 'confirm', 'prompt',
  'performance', 'URL', 'Blob', 'File', 'FileReader', 'FormData', 'Headers',
  'Request', 'Response', 'CustomEvent', 'Event', 'MutationObserver',
  'IntersectionObserver', 'ResizeObserver', 'crypto', 'btoa', 'atob',
  'AbortController', 'TextEncoder', 'TextDecoder',
  'React', 'globalThis', 'self', 'Intl', 'Infinity', 'NaN', 'undefined'
]);

function getAllFiles(dir, exts = ['.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(file))) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcDir = path.resolve('src');
const files = getAllFiles(srcDir);
console.log(`開始全面掃描 ${files.length} 個原始碼檔案之未定義變數 (AST Scope Analysis)...`);

let totalUndeclared = 0;
const errorDetails = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  } catch (err) {
    console.error(`解析失敗 ${file}:`, err.message);
    totalUndeclared++;
    continue;
  }

  const fileUndeclared = [];

  traverse(ast, {
    ReferencedIdentifier(pathNode) {
      const name = pathNode.node.name;
      // 忽略標準全域變數
      if (STANDARD_GLOBALS.has(name)) return;
      
      // 檢查是否在當前作用域或父層作用域中被綁定 (Binding)
      if (!pathNode.scope.hasBinding(name)) {
        // 排除 JSX 物件名稱中的特定屬性 (如 <Component.Property /> 或 props)
        if (pathNode.parentPath.isMemberExpression() && pathNode.parentPath.node.property === pathNode.node && !pathNode.parentPath.node.computed) {
          return;
        }
        // 排除型別註解
        if (pathNode.parentPath.isTSTypeReference()) return;

        const loc = pathNode.node.loc ? `${pathNode.node.loc.start.line}:${pathNode.node.loc.start.column}` : '?';
        fileUndeclared.push({ name, loc });
      }
    }
  });

  if (fileUndeclared.length > 0) {
    totalUndeclared += fileUndeclared.length;
    errorDetails.push({
      file: path.relative(process.cwd(), file),
      issues: fileUndeclared
    });
  }
}

if (totalUndeclared === 0) {
  console.log(`🎉 完美！全部 ${files.length} 個原始碼檔案均無任何未定義變數 (0 Undeclared Variables)！`);
} else {
  console.error(`🚨 警告：在專案中發現 ${totalUndeclared} 個未定義變數引用：`);
  for (const { file, issues } of errorDetails) {
    console.error(`\n📄 ${file}:`);
    for (const issue of issues) {
      console.error(`   - ❌ 未宣告變數: "${issue.name}" (位置: line ${issue.loc})`);
    }
  }
  process.exit(1);
}
