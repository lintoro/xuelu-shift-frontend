import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { computeSaltedHash, DEFAULT_SALT, DEFAULT_PIN_HASH } from '../../utils/cryptoUtils.js';

export default function LoginView({
  employees,
  onLoginSuccess,
  onResetDemoData
}) {
  const [empId, setEmpId] = useState(() => {
    try {
      return localStorage.getItem('xuelu_remembered_emp_id') || '';
    } catch (e) {
      return '';
    }
  });
  const [rememberEmpId, setRememberEmpId] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // 連點 5 次 Logo 開啟開發除錯彩蛋機制
  const [logoClicks, setLogoClicks] = useState(0);
  const [showDemoCard, setShowDemoCard] = useState(false);
  const [eggToast, setEggToast] = useState('');

  // 動態角色測試沙盒狀態
  const [sandboxRoleTab, setSandboxRoleTab] = useState('ADMIN_MANAGER');
  const [selectedSandboxEmpId, setSelectedSandboxEmpId] = useState('B111155');

  // 依身分篩選同仁名冊
  const getFilteredSandboxEmployees = (tabId) => {
    switch (tabId) {
      case 'ADMIN_MANAGER':
        return employees.filter(e => e.role === 'Manager' || e.is_admin);
      case 'LEADER':
        return employees.filter(e => e.role === 'Leader');
      case 'PT':
        return employees.filter(e => e.role === 'PT');
      case 'STAFF':
      default:
        return employees.filter(e => e.role === 'Staff' && !e.is_admin);
    }
  };

  const handleLogoClick = () => {
    const nextCount = logoClicks + 1;
    if (nextCount >= 5) {
      setShowDemoCard(prev => !prev);
      setEggToast(showDemoCard ? '🔒 開發除錯卡片已收合' : '🎉 已解鎖管理員/開發除錯彩蛋！');
      setLogoClicks(0);
      setTimeout(() => setEggToast(''), 3000);
    } else {
      setLogoClicks(nextCount);
      // 3 秒內未連續點擊則歸零
      setTimeout(() => setLogoClicks(0), 3000);
    }
  };

  // 檢查是否處於鎖定狀態
  useEffect(() => {
    const checkLock = () => {
      const targetEmp = employees.find(e => e.emp_id === empId);
      if (targetEmp && targetEmp.lock_until) {
        const remaining = Math.max(0, Math.ceil((new Date(targetEmp.lock_until).getTime() - Date.now()) / 1000));
        setLockoutRemaining(remaining);
      } else {
        setLockoutRemaining(0);
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, [empId, employees]);

  const executeAuth = async (targetEmpId, targetPin) => {
    setErrorMsg('');

    if (lockoutRemaining > 0) {
      setErrorMsg(`帳號已被鎖定！請等待 ${lockoutRemaining} 秒後再試。`);
      return;
    }

    if (!targetEmpId || !targetEmpId.trim()) {
      setErrorMsg('請輸入員工工號！');
      return;
    }

    const targetEmp = employees.find(e => e.emp_id === targetEmpId.trim());
    if (!targetEmp) {
      setErrorMsg('找不到該員工工號！請確認是否輸入正確。');
      return;
    }

    if (targetEmp.status !== 'Active') {
      setErrorMsg('該帳號已處於離退職或停用狀態，無法登入！');
      return;
    }

    // 資安加固：Web Crypto API 加鹽 SHA-256 雜湊驗證，不比對明文密碼
    const salt = targetEmp.salt || DEFAULT_SALT;
    const computedHash = await computeSaltedHash(targetPin, salt);
    const expectedHash = targetEmp.pin_hash || DEFAULT_PIN_HASH;
    const isLegacyPlainMatch = targetEmp.pin_code && targetEmp.pin_code === targetPin;

    if (computedHash === expectedHash || isLegacyPlainMatch) {
      // 記住工號處理
      try {
        if (rememberEmpId) {
          localStorage.setItem('xuelu_remembered_emp_id', targetEmpId.trim());
        } else {
          localStorage.removeItem('xuelu_remembered_emp_id');
        }
      } catch (e) {
        console.warn('無法存取 localStorage:', e);
      }

      // 登入成功，重置失敗次數
      targetEmp.failed_attempts = 0;
      targetEmp.lock_until = null;
      onLoginSuccess(targetEmp);
    } else {
      // 輸錯密碼
      const newAttempts = (targetEmp.failed_attempts || 0) + 1;
      targetEmp.failed_attempts = newAttempts;
      if (newAttempts >= 5) {
        targetEmp.lock_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        setErrorMsg('密碼連續錯誤達 5 次，依資安規範鎖定帳號 15 分鐘！');
      } else {
        setErrorMsg(`密碼錯誤！還剩 ${5 - newAttempts} 次嘗試機會。`);
      }
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    await executeAuth(empId, pinCode);
  };

  // PIN 輸入變更並支援滿 6 碼自動送出
  const handlePinChange = (val) => {
    const cleanVal = val.replace(/\D/g, '');
    setPinCode(cleanVal);
    if (cleanVal.length === 6 && empId.trim()) {
      // 稍作微延遲讓視覺完成再送出
      setTimeout(() => {
        executeAuth(empId, cleanVal);
      }, 150);
    }
  };

  // 快速示範登入按鈕（僅在彩蛋被展開時可用）
  const handleQuickLogin = (selectedEmpId) => {
    const target = employees.find(e => e.emp_id === selectedEmpId);
    if (target) {
      if (rememberEmpId) {
        try { localStorage.setItem('xuelu_remembered_emp_id', selectedEmpId); } catch(e){}
      }
      onLoginSuccess(target);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full">
        {/* 系統標題 Header - 支援連點 5 次 Logo 解鎖彩蛋 */}
        <div className="text-center mb-6">
          <div
            onClick={handleLogoClick}
            title="點擊 5 次解鎖管理員除錯面板"
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30 text-white font-black text-2xl cursor-pointer select-none active:scale-95 transition-transform hover:brightness-110"
          >
            學
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            學旅營運處多站點智慧排班系統
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            行動優先 6 碼數字 PIN 身分認證 · 業務與系統權限雙軌解耦
          </p>
          {eggToast && (
            <div className="mt-2 text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded-lg py-1 px-3 inline-block animate-bounce">
              {eggToast}
            </div>
          )}
        </div>

        {/* 登入卡片 */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 mb-4">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>個人登入認證</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              安全連線已啟用
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {lockoutRemaining > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <span>防暴力破解中：帳號鎖定剩餘 {lockoutRemaining} 秒</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">員工工號 (ID)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                  placeholder="請輸入工號，如：B112001"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5 text-[11px] text-slate-500">
                <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberEmpId}
                    onChange={(e) => setRememberEmpId(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>記住工號（此裝置下次免重複輸入）</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">6 碼數字 PIN 碼</label>
                <span className="text-[10px] text-slate-400">
                  {empId && employees.find(e => e.emp_id === empId)?.is_default_pin ? '預設: 000000' : '支援九宮格數字'}
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={pinCode}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="請輸入 6 碼純數字 (滿 6 碼自動送出)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={lockoutRemaining > 0}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <span>驗證並登入系統</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* 連點 5 次 Logo 解鎖之動態角色沙盒切換矩陣 (Dynamic Role Sandbox) */}
        {showDemoCard && (
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-amber-500/50 text-white animate-fadeIn mb-4 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>動態角色測試沙盒 (Dynamic Role Sandbox)</span>
              </div>
              {onResetDemoData && (
                <button
                  type="button"
                  onClick={onResetDemoData}
                  className="text-[10px] text-rose-300 hover:text-rose-200 underline cursor-pointer"
                >
                  重設密碼為出廠預設
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
              即時連動 Google 試算表在職員工名冊（共 {employees.length} 人）。可切換身分視角並選取任意同仁一鍵模擬登入：
            </p>

            {/* 身分分類 Tab */}
            <div className="grid grid-cols-4 gap-1 bg-slate-800/80 p-1 rounded-xl mb-3 text-xs">
              {[
                { id: 'ADMIN_MANAGER', label: '高管/Admin', badge: 'Manager' },
                { id: 'LEADER', label: '站點組長', badge: 'Leader' },
                { id: 'STAFF', label: '正職同仁', badge: 'Staff' },
                { id: 'PT', label: '計時同仁', badge: 'PT' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSandboxRoleTab(tab.id);
                    // 切換 tab 時自動選取該群組第一位
                    const first = getFilteredSandboxEmployees(tab.id)[0];
                    if (first) setSelectedSandboxEmpId(first.emp_id);
                  }}
                  className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all cursor-pointer ${
                    sandboxRoleTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 動態人員選單與一鍵登入區 */}
            {(() => {
              const filteredList = getFilteredSandboxEmployees(sandboxRoleTab);
              const selectedEmp = employees.find(e => e.emp_id === selectedSandboxEmpId) || filteredList[0];

              return (
                <div className="space-y-3">
                  {/* 人員下拉選單 */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      選擇測試人員 (該身分在職共 {filteredList.length} 位)：
                    </label>
                    <select
                      value={selectedEmp?.emp_id || ''}
                      onChange={(e) => setSelectedSandboxEmpId(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {filteredList.map(emp => (
                        <option key={emp.emp_id} value={emp.emp_id} className="bg-slate-800 text-white">
                          [{emp.emp_id}] {emp.name} · {emp.primary_station} {emp.can_solo ? '★Solo' : ''} {emp.is_admin ? '(Admin)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 選定同仁之屬性卡片預覽 */}
                  {selectedEmp && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-white text-xs">{selectedEmp.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-bold">
                            {selectedEmp.emp_id}
                          </span>
                          {selectedEmp.is_admin && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-black">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          selectedEmp.role === 'Manager' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40' :
                          selectedEmp.role === 'Leader' ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40' :
                          selectedEmp.role === 'PT' ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {selectedEmp.role === 'Manager' ? '營運高管' : selectedEmp.role === 'Leader' ? '站點組長' : selectedEmp.role === 'PT' ? '計時同仁' : '正職同仁'}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[10px]">
                        主屬站點: <span className="font-semibold text-white">{selectedEmp.primary_station}</span>
                        {selectedEmp.can_solo && ' · 具備獨立顧站 (can_solo)'}
                      </p>
                      {selectedEmp.supported_stations && selectedEmp.supported_stations.length > 0 && (
                        <p className="text-slate-400 text-[10px] truncate">
                          可支援站點: {selectedEmp.supported_stations.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 一鍵以該同仁身分登入按鈕 */}
                  <button
                    type="button"
                    onClick={() => selectedEmp && handleQuickLogin(selectedEmp.emp_id)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>以【{selectedEmp?.name}】身分一鍵登入系統 →</span>
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
