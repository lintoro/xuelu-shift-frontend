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
        {/* 左側：登入同仁資訊 (用誰的 ID 登入就是誰，移除模擬切換) */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            {currentEmp.name[0]}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 text-sm">
                {currentEmp.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({currentEmp.emp_id})
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                currentEmp.is_self_scheduled 
                  ? 'bg-purple-100 text-purple-800' 
                  : currentEmp.role === 'Leader'
                  ? 'bg-blue-100 text-blue-800'
                  : currentEmp.role === 'PT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {currentEmp.is_self_scheduled ? 'Manager' : currentEmp.role === 'Leader' ? 'Leader' : currentEmp.role === 'PT' ? 'PT' : 'Staff'}
              </span>
              <span className="text-xs text-slate-500 font-medium">主屬站點: {currentEmp.primary_station}</span>
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
