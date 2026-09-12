// scratch/verify_all_components_ssr.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

console.log('=== 開始構建全元件驗證 Bundle (基於 esbuild) ===');

const bundleFile = path.resolve('scratch/dist_test_bundle.cjs');

try {
  await esbuild.build({
    entryPoints: [path.resolve('scratch/test_all_entry.jsx')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundleFile,
    loader: { '.jsx': 'jsx', '.js': 'js' },
    external: ['react', 'react-dom'],
    define: {
      'import.meta.env': JSON.stringify({
        VITE_GAS_API_URL: 'https://script.google.com/macros/s/test/exec',
        MODE: 'production',
        DEV: false,
        PROD: true
      })
    }
  });
  console.log('✓ Bundle 構建成功！');
} catch (e) {
  console.error('❌ Bundle 構建失敗:', e);
  process.exit(1);
}

// 建立模擬瀏覽器環境
const mockStorage = {};
const fakeLocalStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.window = {
  location: { reload: () => {} },
  localStorage: fakeLocalStorage,
  sessionStorage: fakeLocalStorage,
  navigator: { clipboard: { writeText: async () => {} } },
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.localStorage = fakeLocalStorage;
global.sessionStorage = fakeLocalStorage;
global.document = {
  createElement: () => ({ setAttribute: () => {}, style: {} }),
  getElementById: () => null,
  body: { appendChild: () => {}, removeChild: () => {} }
};
try {
  Object.defineProperty(global, 'window', { value: global.window, writable: true, configurable: true });
} catch (e) {}

const React = require('react');
const ReactDOMServer = require('react-dom/server');
const {
  App,
  PersonnelManagement,
  MonthlyRulesModal,
  ChangePasswordModal,
  LeavePassbookModal,
  GasConnectionModal
} = require(bundleFile);

console.log('\n=== 開始進行 6 大情境之無死角渲染驗證 (SSR Simulation) ===');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runScenario(title, setupFn) {
  totalTests++;
  try {
    fakeLocalStorage.clear();
    setupFn();
    passedTests++;
    console.log(`  ✓ [通過] ${title}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [崩潰] ${title}:`);
    console.error(`     錯誤: ${err.name} - ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(0, 5).map(l => '     ' + l).join('\n'));
    }
  }
}

function renderApp(title, setupFn) {
  totalTests++;
  try {
    fakeLocalStorage.clear();
    setupFn();
    const html = ReactDOMServer.renderToString(React.createElement(App));
    if (html && html.length > 100) {
      passedTests++;
      console.log(`  ✓ [通過] ${title} (渲染大小: ${html.length} bytes)`);
    } else {
      failedTests++;
      console.error(`  ❌ [失敗] ${title}: 輸出 HTML 過小或為空`);
    }
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [崩潰] ${title}:`);
    console.error(`     錯誤: ${err.name} - ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(0, 5).map(l => '     ' + l).join('\n'));
    }
  }
}

// 1. 首次造訪 (完全空白 localStorage)
renderApp('情境 1: 新電腦/手機初次造訪 (完全空白快取 -> 渲染登入頁面)', () => {
  // 不設定任何快取
});

// 2. 高階主管登入 (Manager - 陳鵬宇)
renderApp('情境 2: 營運高管 (Manager) 登入主頁面渲染 (全權限視角)', () => {
  fakeLocalStorage.setItem('xuelu_auth_user_v1', JSON.stringify({
    emp_id: 'B111155',
    name: '陳鵬宇',
    role: 'Manager',
    is_admin: true,
    primary_station: 'ST_ADMIN'
  }));
});

// 3. 站點組長登入 (Leader - 李俐旻)
renderApp('情境 3: 站點組長 (Leader) 登入主頁面渲染 (組長隔離視角)', () => {
  fakeLocalStorage.setItem('xuelu_auth_user_v1', JSON.stringify({
    emp_id: 'B112001',
    name: '李俐旻',
    role: 'Leader',
    is_admin: false,
    primary_station: 'ST_SERVICE'
  }));
});

// 4. 正職同仁登入 (Staff - 林辰恩)
renderApp('情境 4: 正職同仁 (Staff) 登入主頁面渲染 (基層純淨視角)', () => {
  fakeLocalStorage.setItem('xuelu_auth_user_v1', JSON.stringify({
    emp_id: 'B113089',
    name: '林辰恩',
    role: 'Staff',
    is_admin: false,
    primary_station: 'ST_SERVICE'
  }));
});

// 5. 計時人員登入 (PT - 葉佳燕)
renderApp('情境 5: 計時同仁 (PT) 登入主頁面渲染 (報班與工時視角)', () => {
  fakeLocalStorage.setItem('xuelu_auth_user_v1', JSON.stringify({
    emp_id: 'B114001',
    name: '葉佳燕',
    role: 'PT',
    is_admin: false,
    primary_station: 'ST_SERVICE'
  }));
});

// 6. 各主要 Tab 分頁高管逐一切換檢測
const tabs = [
  'MY_DASHBOARD', 'SCHEDULE', 'CONFLICTS', 'SWAPS',
  'HOURS_OVERRIDE', 'MONTHLY_SETTLEMENT', 'PERSONNEL',
  'SHIFT_SETTINGS', 'HOLIDAY_TRANSFER', 'FAIRNESS', 'AUDIT_LOGS'
];

for (const tab of tabs) {
  renderApp(`情境 6-${tab}: 營運高管切換至 [${tab}] 分頁渲染`, () => {
    fakeLocalStorage.setItem('xuelu_auth_user_v1', JSON.stringify({
      emp_id: 'B111155',
      name: '陳鵬宇',
      role: 'Manager',
      is_admin: true,
      primary_station: 'ST_ADMIN'
    }));
    fakeLocalStorage.setItem('xuelu_active_tab_v1', tab);
  });
}

// 7. 各大彈窗 (Modals) 深度隔離渲染檢測
console.log('\n=== 開始進行 7 大核心彈窗 (Modals) 獨立渲染檢測 ===');

const testAdmin = {
  emp_id: 'B111155',
  name: '陳鵬宇',
  role: 'Manager',
  is_admin: true,
  primary_station: 'ST_ADMIN',
  can_solo: true
};

const { STATIONS, EMPLOYEES, DEFAULT_MONTHLY_RULES } = require(path.resolve('src/data/mockMasterData.js'));
const { INITIAL_PASSBOOK_TRANSACTIONS } = require(path.resolve('src/data/leaveStore.js'));

runScenario('彈窗 7-1: PersonnelManagement 人事管理面板 (含動態選派組長、支援站點與Solo)', () => {
  ReactDOMServer.renderToString(React.createElement(PersonnelManagement, {
    employees: EMPLOYEES,
    stations: STATIONS,
    currentUser: testAdmin,
    onUpdateEmployee: () => {},
    onAddEmployee: () => {},
    onUpdateStationLeader: () => {}
  }));
});

runScenario('彈窗 7-2: MonthlyRulesModal 劃休限制設定彈窗 (含法定天數鎖定與配額滑桿)', () => {
  ReactDOMServer.renderToString(React.createElement(MonthlyRulesModal, {
    isOpen: true,
    rules: DEFAULT_MONTHLY_RULES,
    onClose: () => {},
    onSave: () => {}
  }));
});

runScenario('彈窗 7-3: ChangePasswordModal PIN 碼修改彈窗 (含初次登入強制改密)', () => {
  ReactDOMServer.renderToString(React.createElement(ChangePasswordModal, {
    isOpen: true,
    currentUser: testAdmin,
    isForced: true,
    onClose: () => {},
    onSuccess: () => {}
  }));
});

runScenario('彈窗 7-4: LeavePassbookModal 特休/補休個人化存摺彈窗 (含週年制/12-31結算)', () => {
  ReactDOMServer.renderToString(React.createElement(LeavePassbookModal, {
    isOpen: true,
    onClose: () => {},
    currentUser: testAdmin,
    transactions: INITIAL_PASSBOOK_TRANSACTIONS,
    leaveBalance: { annual_leave_days: 7, compensatory_leave_hours: 12 }
  }));
});

runScenario('彈窗 7-5: GasConnectionModal Google Sheets 雲端連線彈窗', () => {
  ReactDOMServer.renderToString(React.createElement(GasConnectionModal, {
    isOpen: true,
    onClose: () => {},
    onSyncSuccess: () => {}
  }));
});

console.log(`\n=== 驗證結果總結: ${passedTests}/${totalTests} 通過，${failedTests} 個失敗 ===`);
if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 所有 21 大情境（包含 6 大初始/身分情境 ＋ 11 大主功能頁 ＋ 5 大彈窗）均通過 SSR 渲染檢驗，0 錯誤！');
}
if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 所有情境均通過 SSR 渲染檢驗，0 錯誤！');
}
