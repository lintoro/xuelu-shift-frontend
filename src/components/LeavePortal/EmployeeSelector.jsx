import React from 'react';
import { User, Shield, Briefcase, Award, Clock } from 'lucide-react';

export default function EmployeeSelector({ 
  employees, 
  currentEmpId, 
  onSelectEmp,
  leaveBalances 
}) {
  const currentEmp = employees.find(e => e.emp_id === currentEmpId) || employees[0];
  const balance = leaveBalances[currentEmpId] || { annualLeaveDays: 0, compTimeHours: 0 };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 左側：身分切換下拉選單 */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            {currentEmp.name[0]}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">模擬登入同仁:</span>
              <select
                value={currentEmpId}
                onChange={(e) => onSelectEmp(e.target.value)}
                className="font-bold text-slate-900 text-sm bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <optgroup label="站點組長 (Leader)">
                  {employees.filter(e => e.role === 'Leader').map(e => (
                    <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.emp_id})</option>
                  ))}
                </optgroup>
                <optgroup label="正職同仁 (Staff)">
                  {employees.filter(e => e.role === 'Staff').map(e => (
                    <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.emp_id})</option>
                  ))}
                </optgroup>
                <optgroup label="計時兼職同仁 (PT)">
                  {employees.filter(e => e.role === 'PT').map(e => (
                    <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.emp_id}) - PT</option>
                  ))}
                </optgroup>
                <optgroup label="營運高階主管 (Manager)">
                  {employees.filter(e => e.is_self_scheduled).map(e => (
                    <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.emp_id}) - 主管</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                currentEmp.is_self_scheduled 
                  ? 'bg-purple-100 text-purple-700' 
                  : currentEmp.role === 'Leader'
                  ? 'bg-blue-100 text-blue-700'
                  : currentEmp.role === 'PT'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {currentEmp.is_self_scheduled ? '營運高管 (規則豁免)' : currentEmp.role === 'Leader' ? '站點組長' : currentEmp.role === 'PT' ? '計時同仁' : '正職同仁'}
              </span>
              <span className="text-xs text-slate-500">主屬站點: {currentEmp.primary_station}</span>
            </div>
          </div>
        </div>

        {/* 右側：個人假別存摺餘額卡片 */}
        {!currentEmp.is_self_scheduled && currentEmp.role !== 'PT' && (
          <div className="flex items-center space-x-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center space-x-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="text-[10px] text-slate-500">週年制法定特休</div>
                <div className="text-xs font-bold text-slate-800">{balance.annualLeaveDays} 天可用</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-[10px] text-slate-500">可用彈性補休</div>
                <div className="text-xs font-bold text-slate-800">{balance.compTimeHours} 小時</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
