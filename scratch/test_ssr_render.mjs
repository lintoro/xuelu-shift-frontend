import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './src/App.jsx';
import LoginView from './src/components/Auth/LoginView.jsx';
import { EMPLOYEES } from './src/data/mockMasterData.js';

try {
  const htmlLogin = ReactDOMServer.renderToString(
    React.createElement(LoginView, { employees: EMPLOYEES, onLoginSuccess: () => {}, onResetDemoData: () => {} })
  );
  console.log('✅ LoginView SSR 渲染 100% 成功！HTML 長度:', htmlLogin.length);
} catch (e) {
  console.error('❌ LoginView SSR 渲染崩潰:', e);
}

try {
  const htmlApp = ReactDOMServer.renderToString(React.createElement(App));
  console.log('✅ App 根組件 SSR 渲染 100% 成功！HTML 長度:', htmlApp.length);
} catch (e) {
  console.error('❌ App 根組件 SSR 渲染崩潰:', e);
}
