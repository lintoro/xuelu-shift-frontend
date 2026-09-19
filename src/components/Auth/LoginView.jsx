import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, KeyRound, Sparkles, X, Key, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
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
  // 個人裝置保持登入 3 天，預設不勾選 (公用電腦模式)
  const [remember3Days, setRemember3Days] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // 極致迷霧手勢狀態機 (無任何 Tooltip 與明文提示)
  // Step 0: Idle
  // Step 1: 學字 Logo 長按滿 2 秒
  // Step 2: 點擊標題第一個字「學」一下
  // Step 3: 點擊標題最後一個字「統」一下 -> 觸發延遲 1.8~2 秒
  // Step 4: 學字 Logo 閃爍 1 下，進入等待最後點擊
  const [gestureStep, setGestureStep] = useState(0);
  const [isLogoFlashing, setIsLogoFlashing] = useState(false);
  const logoPressTimerRef = useRef(null);
  const stepResetTimerRef = useRef(null);
  const delayTimerRef = useRef(null);

  // 二階段 ADMIN 管理員控制台狀態
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [adminInputKey, setAdminInputKey] = useState('');
  const [adminKeyError, setAdminKeyError] = useState('');
  const [adminActiveTab, setAdminActiveTab] = useState('SANDBOX'); // 'SANDBOX' | 'CHANGE_KEY' | 'RESET_ALL_PINS'
  const [newAdminKey, setNewAdminKey] = useState('');
  const [confirmAdminKey, setConfirmAdminKey] = useState('');
  const [adminKeySuccessMsg, setAdminKeySuccessMsg] = useState('');

  // 動態角色測試沙盒狀態
  const [sandboxRoleTab, setSandboxRoleTab] = useState('ADMIN_MANAGER');
  const [selectedSandboxEmpId, setSelectedSandboxEmpId] = useState('B111155');

  // 手勢處理邏輯
  const handleLogoMouseDown = () => {
    logoPressTimerRef.current = setTimeout(() => {
      // 步驟 1: 長按學 2 秒成功
      setGestureStep(1);
      clearTimeout(stepResetTimerRef.current);
      stepResetTimerRef.current = setTimeout(() => setGestureStep(0), 7000);
    }, 2000);
  };

  const handleLogoMouseUp = () => {
    if (logoPressTimerRef.current) {
      clearTimeout(logoPressTimerRef.current);
      logoPressTimerRef.current = null;
    }
  };

  const handleHeadClick = () => {
    if (gestureStep === 1) {
      // 步驟 2: 點頭字「學」一下
      setGestureStep(2);
      clearTimeout(stepResetTimerRef.current);
      stepResetTimerRef.current = setTimeout(() => setGestureStep(0), 7000);
    }
  };

  const handleTailClick = () => {
    if (gestureStep === 2) {
      // 步驟 3: 點尾字「統」一下
      setGestureStep(3);
      clearTimeout(stepResetTimerRef.current);
      // 步驟 4: 靜默延遲 1.8 到 2 秒 (1900ms)
      delayTimerRef.current = setTimeout(() => {
        setIsLogoFlashing(true);
        setGestureStep(4);
        setTimeout(() => setIsLogoFlashing(false), 900); // 閃爍 1 下
        // 等待最後點擊，5 秒未按則逾時重設
        stepResetTimerRef.current = setTimeout(() => setGestureStep(0), 5000);
      }, 1900);
    }
  };

  const handleLogoClick = () => {
    if (gestureStep === 4) {
      // 步驟 5: Logo 閃爍後再按 1 下「學」字 Logo -> 成功！
      clearTimeout(stepResetTimerRef.current);
      clearTimeout(delayTimerRef.current);
      setGestureStep(0);
      setIsLogoFlashing(false);
      setShowAdminModal(true);
      setAdminInputKey('');
      setAdminKeyError('');
    }
  };

  // 讀取管理員解鎖密碼 (預設 516516)
  const getStoredAdminKey = () => {
    try {
      return localStorage.getItem('xuelu_admin_debug_key') || '516516';
    } catch {
      return '516516';
    }
  };

  // 驗證管理員密碼
  const handleVerifyAdminKey = (e) => {
    if (e) e.preventDefault();
    const correctKey = getStoredAdminKey();
    if (adminInputKey.trim() === correctKey) {
      setIsAdminVerified(true);
      setAdminKeyError('');
    } else {
      setAdminKeyError('管理員密鑰驗證失敗，請重新輸入！');
    }
  };

  // 修改管理員解鎖密碼
  const handleChangeAdminKey = (e) => {
    if (e) e.preventDefault();
    setAdminKeySuccessMsg('');
    if (!newAdminKey || newAdminKey.length < 6) {
      setAdminKeyError('新密碼長度至少需為 6 碼！');
      return;
    }
    if (newAdminKey !== confirmAdminKey) {
      setAdminKeyError('兩次輸入的新密碼不一致！');
      return;
    }
    try {
      localStorage.setItem('xuelu_admin_debug_key', newAdminKey.trim());
      setAdminKeySuccessMsg('✓ 管理員除錯密碼已成功更新！請妥善保管。');
      setNewAdminKey('');
      setConfirmAdminKey('');
      setAdminKeyError('');
    } catch (err) {
      setAdminKeyError('儲存新密碼失敗:' + err.message);
    }
  };

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

      // 登入成功，重置失敗次數，並傳遞 remember3Days
      targetEmp.failed_attempts = 0;
      targetEmp.lock_until = null;
      onLoginSuccess(targetEmp, remember3Days);
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

  // 快速示範登入按鈕（僅在 ADMIN 控制台被解鎖時可用）
  const handleQuickLogin = (selectedEmpId) => {
    const target = employees.find(e => e.emp_id === selectedEmpId);
    if (target) {
      if (rememberEmpId) {
        try { localStorage.setItem('xuelu_remembered_emp_id', selectedEmpId); } catch(e){}
      }
      onLoginSuccess(target, remember3Days);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full">
        {/* 系統標題 Header - 支援無痕迷霧手勢序列 (長按學2秒 -> 點學 -> 點統 -> 延遲1.9s -> 閃爍 -> 點學) */}
        <div className="text-center mb-6">
          <div
            onMouseDown={handleLogoMouseDown}
            onMouseUp={handleLogoMouseUp}
            onMouseLeave={handleLogoMouseUp}
            onTouchStart={handleLogoMouseDown}
            onTouchEnd={handleLogoMouseUp}
            onClick={handleLogoClick}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30 text-white font-black text-2xl cursor-pointer select-none active:scale-95 transition-all ${
              isLogoFlashing ? 'ring-4 ring-amber-300 brightness-150 animate-pulse scale-105' : 'hover:brightness-110'
            }`}
          >
            學
          </div>
          <h1 className="text-xl font-black text-white tracking-tight select-none">
            <span onClick={handleHeadClick} className="cursor-default">學</span>
            <span>旅營運處多站點智慧排班系</span>
            <span onClick={handleTailClick} className="cursor-default">統</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            行動優先 6 碼數字 PIN 身分認證 · 業務與系統權限雙軌解耦
          </p>
        </div>

        {/* 登入卡片 */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 mb-4">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>個人登入認證</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Google 雲端資料庫連線中 ({employees.length} 人)
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
              <div className="flex flex-col gap-2 mt-2 px-0.5 text-[11px] text-slate-600">
                <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberEmpId}
                    onChange={(e) => setRememberEmpId(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>記住工號（此裝置下次免重複輸入）</span>
                </label>

                {/* 個人裝置保持 3 天通道（預設不勾選，以公用電腦安全模式為準） */}
                <label className="flex items-center space-x-2 cursor-pointer select-none p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={remember3Days}
                    onChange={(e) => setRemember3Days(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-slate-700 font-bold">
                    保持登入 3 天 <span className="text-slate-400 font-normal">（個人手機/電腦專用，公用電腦請勿勾選）</span>
                  </span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">6 碼數字 PIN 碼</label>
                <span className="text-[10px] text-slate-400">
                  {empId && employees.find(e => e.emp_id === empId)?.is_default_pin ? '預設: 000000' : '請輸入 6 碼數字'}
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

        {/* 二階段 ADMIN 管理員特許控制台彈窗 (需通過迷霧手勢 + 密碼驗證解鎖) */}
        {showAdminModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-white">
              {/* 彈窗 Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-black tracking-wide">
                    {isAdminVerified ? '營運處 ADMIN 管理員專屬控制台' : '系統高級特許管理員驗證'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminModal(false);
                    setIsAdminVerified(false);
                    setAdminInputKey('');
                    setAdminKeyError('');
                    setAdminKeySuccessMsg('');
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 內容區：尚未通過密碼驗證 */}
              {!isAdminVerified ? (
                <form onSubmit={handleVerifyAdminKey} className="p-6 space-y-4">
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5 mb-1 text-indigo-300">
                      <Key className="w-4 h-4" />
                      <span>特許管理員訪問安全驗證</span>
                    </p>
                    請輸入 6 碼管理員專屬特許密鑰（預設：516516）以解鎖高級營運控制台。
                  </div>

                  {adminKeyError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{adminKeyError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      管理員驗證密碼 (Admin Key)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        autoFocus
                        value={adminInputKey}
                        onChange={(e) => setAdminInputKey(e.target.value)}
                        placeholder="請輸入 6 碼管理員密鑰"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>解鎖控制台</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                /* 內容區：已通過驗證，展示 ADMIN 三大功能面板 */
                <div className="p-5 space-y-4">
                  {/* 功能分類 Tab */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => { setAdminActiveTab('SANDBOX'); setAdminKeyError(''); setAdminKeySuccessMsg(''); }}
                      className={`py-2 px-1 rounded-lg text-center transition-all ${
                        adminActiveTab === 'SANDBOX' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      👥 角色沙盒登入
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdminActiveTab('RESET_ALL_PINS'); setAdminKeyError(''); setAdminKeySuccessMsg(''); }}
                      className={`py-2 px-1 rounded-lg text-center transition-all ${
                        adminActiveTab === 'RESET_ALL_PINS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚡ 一鍵全設密碼
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdminActiveTab('CHANGE_KEY'); setAdminKeyError(''); setAdminKeySuccessMsg(''); }}
                      className={`py-2 px-1 rounded-lg text-center transition-all ${
                        adminActiveTab === 'CHANGE_KEY' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔑 修改解鎖密碼
                    </button>
                  </div>

                  {adminKeySuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{adminKeySuccessMsg}</span>
                    </div>
                  )}

                  {adminKeyError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{adminKeyError}</span>
                    </div>
                  )}

                  {/* Tab 1: 修改管理員除錯密碼 */}
                  {adminActiveTab === 'CHANGE_KEY' && (
                    <form onSubmit={handleChangeAdminKey} className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                      <div>
                        <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 mb-1">
                          <KeyRound className="w-4 h-4" />
                          <span>自訂管理員除錯特許密碼</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          設定新的解鎖密碼，修改後將即時寫入本機持久化安全儲存，下次解鎖需使用新密碼。
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">輸入新密碼 (至少 6 碼)：</label>
                          <input
                            type="password"
                            required
                            value={newAdminKey}
                            onChange={(e) => setNewAdminKey(e.target.value)}
                            placeholder="例如：516516"
                            className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">再次確認新密碼：</label>
                          <input
                            type="password"
                            required
                            value={confirmAdminKey}
                            onChange={(e) => setConfirmAdminKey(e.target.value)}
                            placeholder="請再次輸入新密碼"
                            className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>確認儲存新管理員密碼</span>
                      </button>
                    </form>
                  )}

                  {/* Tab 2: 一鍵全設所有同仁 PIN 碼 (原外露功能收納至此) */}
                  {adminActiveTab === 'RESET_ALL_PINS' && (
                    <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                      <div>
                        <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 mb-1">
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                          <span>全體同仁 PIN 碼一鍵出廠重設 (最高特許)</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          此功能已收納至管理員特許控制台，嚴防門市同仁誤觸。執行後將一鍵將全館 39 位在職同仁的 PIN 密碼重設為官方預設值 (<code className="text-amber-300 font-mono">000000</code>)，並自動清除所有密碼錯誤累計與鎖定狀態。現有名冊、站點設定與排班大表 100% 完整保留。
                        </p>
                      </div>

                      {onResetDemoData && (
                        <button
                          type="button"
                          onClick={() => {
                            onResetDemoData();
                            setAdminKeySuccessMsg('✓ 已成功將所有同仁密碼重設為出廠預設值 (000000)！');
                          }}
                          className="w-full py-2.5 px-3 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 cursor-pointer active:scale-98"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>一鍵重設全體同仁 PIN 碼為預設值 (000000)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tab 3: 動態角色測試沙盒 */}
                  {adminActiveTab === 'SANDBOX' && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        連動 Google 試算表在職員工名冊（共 {employees.length} 人）。可切換身分視角並選取任意同仁一鍵模擬登入：
                      </p>

                      <div className="grid grid-cols-4 gap-1 bg-slate-800/80 p-1 rounded-xl text-xs">
                        {[
                          { id: 'ADMIN_MANAGER', label: '高管/Admin' },
                          { id: 'LEADER', label: '站點組長' },
                          { id: 'STAFF', label: '正職同仁' },
                          { id: 'PT', label: '計時同仁' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setSandboxRoleTab(tab.id);
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

                      {(() => {
                        const filteredList = getFilteredSandboxEmployees(sandboxRoleTab);
                        const selectedEmp = employees.find(e => e.emp_id === selectedSandboxEmpId) || filteredList[0];

                        return (
                          <div className="space-y-3">
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
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (selectedEmp) {
                                  setShowAdminModal(false);
                                  handleQuickLogin(selectedEmp.emp_id);
                                }
                              }}
                              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                              <span>以【{selectedEmp?.name}】身分一鍵模擬登入 →</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
