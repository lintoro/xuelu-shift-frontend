import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  ShieldAlert, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Sun, 
  Moon, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';
import { isWorkingShift, isOffShift } from '../../types/scheduler.js';
import { formatShiftTime } from '../../utils/timeFormatUtils.js';

// 預設 8 大視覺配色調色盤
const COLOR_PRESETS = [
  {
    id: 'purple',
    name: '丁香紫 (特賣/專櫃)',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    badgeColor: 'bg-purple-500 text-white',
    ring: 'ring-purple-400'
  },
  {
    id: 'indigo',
    name: '極致靛 (夜間/打烊)',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    badgeColor: 'bg-indigo-600 text-white',
    ring: 'ring-indigo-400'
  },
  {
    id: 'teal',
    name: '松石綠 (早鳥/機動)',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    badgeColor: 'bg-teal-600 text-white',
    ring: 'ring-teal-400'
  },
  {
    id: 'pink',
    name: '玫瑰粉 (假日特企)',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    badgeColor: 'bg-pink-500 text-white',
    ring: 'ring-pink-400'
  },
  {
    id: 'orange',
    name: '晨曦橙 (跨時段支援)',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    badgeColor: 'bg-orange-500 text-white',
    ring: 'ring-orange-400'
  },
  {
    id: 'cyan',
    name: '蔚藍青 (尖峰短班)',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    badgeColor: 'bg-cyan-500 text-white',
    ring: 'ring-cyan-400'
  },
  {
    id: 'emerald',
    name: '翡翠綠 (全日常規)',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeColor: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-400'
  },
  {
    id: 'slate',
    name: '石墨灰 (靜態後勤)',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    badgeColor: 'bg-slate-600 text-white',
    ring: 'ring-slate-400'
  }
];

// 核心不可刪除班別 (含核心出勤班別與各類勞基法定假別)
const CORE_SHIFT_CODES = ['A', 'B', 'C', 'OFF', 'TERM_OFF', 'AL', 'CT', 'SL', 'PL', 'ML', 'FL', 'MAT', 'CL'];

// 產生時間刻度選項 (07:00 ~ 24:00, 30分鐘一刻度)
const TIME_OPTIONS = [];
for (let h = 7; h <= 24; h++) {
  const hStr = h < 10 ? `0${h}` : `${h}`;
  TIME_OPTIONS.push(`${hStr}:00`);
  if (h < 24) {
    TIME_OPTIONS.push(`${hStr}:30`);
  }
}

/**
 * 營業班別主檔動態維護管理面板 (Shift Master Management)
 * 由營運主管 (Manager) 專責規劃。
 * 支援門市營業面對商場活動、假日檔期自訂開立 D、E、F 等新班別，
 * 具備勞基法第 35 條休息防呆即時試算，並支援全系統連動。
 */
export default function ShiftMasterManagement({
  shiftTypes,
  onSaveShiftType,
  onDeleteShiftType,
  onResetShiftTypes,
  currentUser
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null); // null 表示新增，有值表示編輯
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // 表單狀態
  const [formState, setFormState] = useState({
    code: '',
    name: '',
    startTime: '11:00',
    endTime: '20:00',
    breakHours: 1,
    description: '',
    colorThemeId: 'purple',
    isActive: true
  });

  // 試算時數
  const calculateWorkHours = (start, end, breakH) => {
    if (!start || !end || start === '-' || end === '-') return { durationHours: 0, workHours: 0 };
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let startMin = sH * 60 + sM;
    let endMin = eH * 60 + eM;
    if (endMin < startMin) {
      // 跨午夜
      endMin += 24 * 60;
    }
    const totalDurationHours = (endMin - startMin) / 60;
    const netHours = Math.max(0, totalDurationHours - Number(breakH || 0));
    return {
      durationHours: totalDurationHours,
      workHours: Number(netHours.toFixed(1))
    };
  };

  const { durationHours, workHours } = calculateWorkHours(
    formState.startTime,
    formState.endTime,
    formState.breakHours
  );

  // 勞基法第 35 條防呆判定：工作跨度 >= 4.5 小時需配置至少 30 分鐘休息
  const isRestBreached = durationHours >= 4.5 && Number(formState.breakHours) < 0.5;

  // 開啟新增彈窗
  const handleOpenCreate = () => {
    // 自動尋找下一個建議代碼 (D, E, F...)
    const existingCodes = Object.keys(shiftTypes);
    const candidates = ['D', 'E', 'F', 'G', 'H', 'S1', 'S2', 'N1'];
    const nextCode = candidates.find(c => !existingCodes.includes(c)) || 'EX';

    setEditingCode(null);
    setFormState({
      code: nextCode,
      name: '',
      startTime: '12:00',
      endTime: '21:00',
      breakHours: 1,
      description: '',
      colorThemeId: 'purple',
      isActive: true
    });
    setIsModalOpen(true);
  };

  // 開啟編輯彈窗
  const handleOpenEdit = (shift) => {
    setEditingCode(shift.code);
    // 比對色彩預設
    const matchedPreset = COLOR_PRESETS.find(p => p.badgeColor === shift.badgeColor) || COLOR_PRESETS[0];

    setFormState({
      code: shift.code,
      name: shift.name,
      startTime: shift.startTime === '-' ? '09:00' : shift.startTime,
      endTime: shift.endTime === '-' ? '18:00' : shift.endTime,
      breakHours: shift.breakHours || 0,
      description: shift.description || '',
      colorThemeId: matchedPreset.id,
      isActive: shift.isActive !== false
    });
    setIsModalOpen(true);
  };

  // 提交儲存表單
  const handleSubmitForm = (e) => {
    e.preventDefault();
    const codeUpper = formState.code.trim().toUpperCase();
    if (!codeUpper) {
      alert('請輸入有效的班別代碼！');
      return;
    }

    if (!formState.name.trim()) {
      alert('請輸入班別名稱！');
      return;
    }

    // 重複性檢查 (若為新增)
    if (!editingCode && shiftTypes[codeUpper]) {
      alert(`班別代碼【${codeUpper}】已存在，請使用其他代碼！`);
      return;
    }

    const selectedTheme = COLOR_PRESETS.find(p => p.id === formState.colorThemeId) || COLOR_PRESETS[0];

    const newShiftObj = {
      code: codeUpper,
      name: formState.name.trim(),
      startTime: formState.startTime,
      endTime: formState.endTime,
      breakHours: Number(formState.breakHours),
      workHours: workHours,
      color: selectedTheme.color,
      badgeColor: selectedTheme.badgeColor,
      description: formState.description.trim() || '自訂營業排班班別',
      isActive: formState.isActive
    };

    onSaveShiftType(newShiftObj);
    setIsModalOpen(false);
    setFeedbackMsg(`已成功儲存班別【${codeUpper} - ${formState.name}】！`);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // 刪除班別
  const handleDelete = (code) => {
    if (CORE_SHIFT_CODES.includes(code)) {
      alert(`班別【${code}】為系統核心關鍵班別，禁止刪除！`);
      return;
    }
    if (window.confirm(`確定要刪除班別【${code} - ${shiftTypes[code]?.name}】嗎？`)) {
      onDeleteShiftType(code);
      setFeedbackMsg(`已成功刪除班別【${code}】！`);
      setTimeout(() => setFeedbackMsg(''), 3500);
    }
  };

  const shiftList = Object.values(shiftTypes);
  const workingShifts = shiftList.filter(s => isWorkingShift(s.code));
  const offShifts = shiftList.filter(s => isOffShift(s.code));

  return (
    <div className="space-y-6">
      {/* 頂部引言與操作面板 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-100 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">營業班別主檔維護中心 (Shift Master)</h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                  Manager 專屬規劃權限
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                掌管門市各項尖離峰、大檔期與專櫃營業時段。支援動態開立 D、E、F 等班別，排班大表與調班門戶將自動連動。
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                if (window.confirm('確定要將所有班別還原回原廠預設值 (A, B, C, D, OFF, AL, CT) 嗎？')) {
                  onResetShiftTypes();
                  setFeedbackMsg('已成功將班別清單還原至出廠設定！');
                  setTimeout(() => setFeedbackMsg(''), 3500);
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>還原出廠設定</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新增營業班別 (如 E、F 班)</span>
            </button>
          </div>
        </div>

        {/* 提示訊息 */}
        {feedbackMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-xs text-emerald-800 font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* 統計摘要儀表卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">系統註冊班別總數</span>
            <div className="text-2xl font-black text-slate-800 mt-0.5">{shiftList.length} 組</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700">在勤營業班別 (排班出勤)</span>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">{workingShifts.length} 種</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sun className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-700">法定與休假假別 (例休/特休/補休)</span>
            <div className="text-2xl font-black text-purple-900 mt-0.5">{offShifts.length} 種</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Moon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 在勤營業班別清單 (營業班次) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">在勤營業排班班別清單</h3>
            <span className="text-xs text-slate-500">（供站點排班、主管實勤覆核、同仁調班選用）</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {workingShifts.map((shift) => {
            const isCore = CORE_SHIFT_CODES.includes(shift.code);
            return (
              <div
                key={shift.code}
                className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-8 h-8 rounded-lg ${shift.badgeColor || 'bg-indigo-600 text-white'} flex items-center justify-center font-black text-sm shadow-xs`}>
                        {shift.code}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{shift.name}</h4>
                        <span className="text-[11px] text-slate-500">
                          {isCore ? '系統核心班別' : '營業自訂班別'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(shift)}
                        title="編輯班別"
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!isCore && (
                        <button
                          onClick={() => handleDelete(shift.code)}
                          title="刪除自訂班別"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 時段與工時資訊 */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">排定出勤時段</span>
                      <span className="font-semibold text-slate-800">
                        {formatShiftTime(shift.startTime)} ~ {formatShiftTime(shift.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">休息與淨工時</span>
                      <span className="font-semibold text-indigo-700">
                        休息 {shift.breakHours}h · 實勤 {shift.workHours}h
                      </span>
                    </div>
                  </div>

                  {/* 說明文字 */}
                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {shift.description || '無特別說明'}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className={`px-2 py-0.5 rounded-md border font-medium ${shift.color || 'bg-slate-100 text-slate-700'}`}>
                    標籤預覽：{shift.code} 班
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                    啟用中
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 法定假別與離職真空 (唯讀檢視保護) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Moon className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-800">法定假別與特定非出勤班別</h3>
            <span className="text-xs text-slate-500">（由勞基法規範與差勤體系保障，系統鎖定保護）</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
          {offShifts.map((shift) => (
            <div key={shift.code} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${shift.badgeColor}`}>
                  {shift.code}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">系統保護</span>
              </div>
              <div className="font-bold text-xs text-slate-800">{shift.name}</div>
              <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                {shift.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新增 / 編輯班別 Modal 彈窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[88vh] flex flex-col my-auto border border-slate-200 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingCode ? `編輯班別【${editingCode}】` : '新增自訂營業班別 (如 E / F 班)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">設定營業時段、休息時間與大表辨識色彩</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* 班別代碼與名稱 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      班別代碼 (Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formState.code}
                      disabled={!!editingCode}
                      onChange={(e) => setFormState({ ...formState, code: e.target.value.toUpperCase() })}
                      placeholder="如 E、F、S1"
                      maxLength={4}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      required
                    />
                    <span className="text-[10px] text-slate-400">大寫英數 1~4 碼</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      班別名稱 (Name) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      placeholder="如 夜間打烊班、特賣短班"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-400">營運白話名稱</span>
                  </div>
                </div>

                {/* 出勤起訖時間與休息時數 */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      開始出勤時間
                    </label>
                    <select
                      value={formState.startTime}
                      onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                      className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      結束出勤時間
                    </label>
                    <select
                      value={formState.endTime}
                      onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
                      className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      休息時數 (小時)
                    </label>
                    <select
                      value={formState.breakHours}
                      onChange={(e) => setFormState({ ...formState, breakHours: Number(e.target.value) })}
                      className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={0}>0 小時</option>
                      <option value={0.5}>0.5 小時 (30分)</option>
                      <option value={1}>1.0 小時 (60分)</option>
                      <option value={1.5}>1.5 小時</option>
                      <option value={2}>2.0 小時</option>
                    </select>
                  </div>
                </div>

                {/* 即時工時計算與勞基法 35 條防呆提示卡 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">在勤總跨度：{durationHours} 小時</span>
                    <span className="text-xs font-bold text-slate-800">
                      實際淨出勤工時：<strong className="text-indigo-600 text-sm font-black">{workHours}</strong> 小時
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                      計入當月總工時
                    </span>
                  </div>
                </div>

                {isRestBreached && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-tight">
                      <strong>勞基法第 35 條防呆警示</strong>：連續工作跨度達 {durationHours} 小時，法定應配置至少 30 分鐘（0.5小時）休息時間，避免衍生勞資爭議。
                    </div>
                  </div>
                )}

                {/* 視覺風格調色盤選取 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    排班大表標籤配色 (Badge Color)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = formState.colorThemeId === preset.id;
                      return (
                        <button
                          type="button"
                          key={preset.id}
                          onClick={() => setFormState({ ...formState, colorThemeId: preset.id })}
                          className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                            isSelected 
                              ? `border-indigo-600 bg-indigo-50/50 ring-2 ${preset.ring}` 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md ${preset.badgeColor} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                            {formState.code || '班'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 truncate">
                            {preset.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 說明備註 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    班別說明與現場任務規劃
                  </label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    rows={2}
                    placeholder="說明此班別適用情境，例如：週五晚間特賣會人流疏導、假日跨店支援..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Buttons (固定置底) */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all cursor-pointer"
                >
                  儲存並套用至全系統
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
