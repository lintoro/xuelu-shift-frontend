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

        {/* 連點 5 次 Logo 解鎖之管理員彩蛋面版 */}
        {showDemoCard && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-amber-500/40 text-white animate-fadeIn mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>開發管理除錯專用：雙軌解耦一鍵切換卡</span>
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
              此面板已隱藏為管理員彩蛋（連點 5 次 Logo 展開或收合），門市同仁日常介面已 100% 純淨留白。
            </p>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* 角色 1: 營運高階主管 兼 系統管理員 (ADMIN MANAGER) */}
              <button
                onClick={() => handleQuickLogin('B111155')}
                className="w-full p-2.5 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-between text-left transition-colors cursor-pointer border border-purple-400/40"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">陳鵬宇 (B111155)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-black tracking-wide">ADMIN MANAGER</span>
                  </div>
                  <span className="text-[11px] text-purple-200 block mt-0.5">
                    業務角色: Manager (營運高管) · 掌管人事/國假調移/排班終審
                  </span>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shrink-0">Admin 登入</span>
              </button>

              {/* 角色 2: 正職同仁 兼 系統管理員 (ADMIN STAFF) */}
              <button
                onClick={() => handleQuickLogin('B111014')}
                className="w-full p-2.5 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-between text-left transition-colors cursor-pointer border border-indigo-400/40"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">林慶忠 (B111014)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-black tracking-wide">ADMIN STAFF</span>
                  </div>
                  <span className="text-[11px] text-indigo-200 block mt-0.5">
                    業務角色: Staff (正職同仁) · 數據總控與回滾 (技術維護/無高管終審權)
                  </span>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0">Admin 登入</span>
              </button>

              {/* 角色 3: 站點組長 (Leader) */}
              <button
                onClick={() => handleQuickLogin('B112001')}
                className="w-full p-2 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-white">李俐旻 (B112001)</span>
                  <span className="text-[10px] text-blue-300 block">
                    業務角色: Leader (服務台組長) · 站點每日出勤燈號與初審
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/40 text-blue-200 font-semibold">登入</span>
              </button>

              {/* 角色 4: 一般正職 (Staff) */}
              <button
                onClick={() => handleQuickLogin('B113089')}
                className="w-full p-2 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-white">張舒扉 (B113089)</span>
                  <span className="text-[10px] text-emerald-300 block">
                    業務角色: Staff (服務台正職) · 我的專屬工作台與自選劃休
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/40 text-emerald-200 font-semibold">登入</span>
              </button>

              {/* 角色 5: 計時同仁 (PT) */}
              <button
                onClick={() => handleQuickLogin('A202601')}
                className="w-full p-2 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-white">陳盈如(PT) (A202601)</span>
                  <span className="text-[10px] text-amber-300 block">
                    業務角色: PT (計時人員) · 雙軌報班與時薪總工時存摺
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/40 text-amber-200 font-semibold">登入</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
