import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Check, X, Lock } from 'lucide-react';
import { computeSaltedHash, generateSalt, DEFAULT_SALT, DEFAULT_PIN_HASH } from '../../utils/cryptoUtils.js';

export default function ChangePasswordModal({
  employee,
  isOpen,
  isForced = false,
  onClose,
  onChangePinSuccess
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const weakPins = ['000000', '123456', '654321', '111111', '222222', '333333', '888888'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // 格式驗證
    if (!/^\d{6}$/.test(newPin)) {
      setErrorMsg('新密碼必須為 6 碼純數字！');
      return;
    }

    if (weakPins.includes(newPin)) {
      setErrorMsg('禁止使用弱密碼（如 000000, 123456, 111111 等）！');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('兩次輸入的新密碼不一致！');
      return;
    }

    // 若非強制首次更換，需校驗舊密碼
    if (!isForced) {
      const computedOldHash = await computeSaltedHash(currentPin, employee.salt || DEFAULT_SALT);
      const expectedOldHash = employee.pin_hash || DEFAULT_PIN_HASH;
      const isLegacyMatch = employee.pin_code && employee.pin_code === currentPin;
      if (computedOldHash !== expectedOldHash && !isLegacyMatch) {
        setErrorMsg('舊密碼驗證錯誤！');
        return;
      }
    }

    // 資安加固：為新密碼生成專屬隨機 Salt，並計算 Salted SHA-256 雜湊
    const newSalt = generateSalt(16);
    const newPinHash = await computeSaltedHash(newPin, newSalt);
    onChangePinSuccess(employee.emp_id, newPinHash, newSalt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-scaleUp">
        <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isForced ? '首次登入：強制設定個人 6 碼 PIN 碼' : '變更個人 6 碼 PIN 密碼'}
            </h3>
            <p className="text-xs text-slate-500">
              {isForced 
                ? '依據資安防護規範，首次使用預設密碼需立即變更' 
                : `${employee.name} (${employee.emp_id})`}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {!isForced && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">當前舊密碼 (6碼數字)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="請輸入原密碼"
                className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-sm tracking-widest text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">自訂新密碼 (6碼純數字)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="請輸入新 6 碼數字"
              className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-sm tracking-widest text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">再次確認新密碼</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="再次輸入新 6 碼數字"
              className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-sm tracking-widest text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            {!isForced && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
              >
                取消
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm cursor-pointer active:scale-95"
            >
              確認設定新密碼
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
