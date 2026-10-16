import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 讀取 .env.local 中的部署設定 (若存在)
let deploymentId = '';
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('CLASP_DEPLOYMENT_ID=')) {
      deploymentId = trimmed.split('=')[1]?.trim() || '';
    } else if (trimmed.startsWith('VITE_GAS_API_URL=') && !deploymentId) {
      // 嘗試從 Web App URL 提取 Deployment ID
      const match = trimmed.match(/\/s\/([a-zA-Z0-9_-]+)\/exec/);
      if (match) deploymentId = match[1];
    }
  });
}

console.log('=== Google Apps Script 自動化發布流水線 ===');
console.log('1. 正在推送最新代碼 (clasp push)...');
execSync('npx @google/clasp push', { stdio: 'inherit' });

console.log('\n2. 正在更新部署版本 (clasp deploy)...');
if (deploymentId) {
  console.log(`目標部署 ID: ${deploymentId.slice(0, 10)}... (已從本機環境變數載入)`);
  execSync(`npx @google/clasp deploy -i "${deploymentId}" -d "IDE一鍵發布"`, { stdio: 'inherit' });
} else {
  console.log('未偵測到自訂部署 ID，執行常規版本發布...');
  execSync('npx @google/clasp deploy -d "IDE一鍵發布"', { stdio: 'inherit' });
}

console.log('\n🎉 GAS 自動化部署完成！');
