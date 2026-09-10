import { readFileSync } from 'fs';
import { resolve } from 'path';

// 尋找 dist/assets/index-*.js
import { readdirSync } from 'fs';
const files = readdirSync('dist/assets');
const jsFile = files.find(f => f.endsWith('.js'));
console.log('Testing JS bundle:', jsFile);

// 模擬瀏覽器全域環境
global.window = {
  location: { href: 'http://localhost:3000' },
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  },
  addEventListener() {},
  removeEventListener() {}
};
global.localStorage = global.window.localStorage;
global.document = {
  getElementById() { return { appendChild() {} }; },
  createElement() { return { setAttribute() {} }; }
};
try {
  Object.defineProperty(global, 'navigator', { value: { userAgent: 'node' }, configurable: true });
} catch(e) {}

const content = readFileSync(`dist/assets/${jsFile}`, 'utf-8');
console.log('Bundle length:', content.length);
try {
  // 檢查語法
  new Function(content);
  console.log('✅ JS Bundle 語法檢驗 100% 正確，無語法錯誤！');
} catch (e) {
  console.error('❌ JS Bundle 語法錯誤:', e);
}
