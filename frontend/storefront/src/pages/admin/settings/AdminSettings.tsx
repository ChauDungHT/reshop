import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../../../shared-ui/src/lib/axios';

interface ToolPermission {
  tool_code: string;
  tool_name: string;
  allowed_roles: string[];
}

const AdminSettings: React.FC = () => {
  // Tool Permissions management states
  const [localPermissions, setLocalPermissions] = useState<ToolPermission[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const ROLES = [
    { code: 'guest', label: 'Khách (Guest)' },
    { code: 'customer', label: 'Khách hàng (Customer)' },
    { code: 'vendor', label: 'Người bán (Vendor)' },
    { code: 'admin', label: 'Quản trị (Admin)' },
  ];

  // Fetch AI Tool access permissions
  const { data: permissions, refetch: refetchPermissions } = useQuery<ToolPermission[]>({
    queryKey: ['tool-permissions'],
    queryFn: async () => {
      const res = await axiosInstance.get('/tool-permissions');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions);
    }
  }, [permissions]);

  const handleToggle = (toolCode: string, roleCode: string) => {
    if (!localPermissions) return;
    setLocalPermissions(prev => {
      if (!prev) return null;
      return prev.map(p => {
        if (p.tool_code !== toolCode) return p;
        const exists = p.allowed_roles.includes(roleCode);
        const newRoles = exists
          ? p.allowed_roles.filter(r => r !== roleCode)
          : [...p.allowed_roles, roleCode];
        return { ...p, allowed_roles: newRoles };
      });
    });
  };

  const handleSave = async () => {
    if (!localPermissions) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await axiosInstance.put('/tool-permissions/admin', {
        permissions: localPermissions.map(p => ({
          tool_code: p.tool_code,
          allowed_roles: p.allowed_roles,
        })),
      });
      setSaveStatus({ type: 'success', message: 'Cấu hình quyền truy cập công cụ AI đã được lưu thành công!' });
      refetchPermissions();
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      console.error('Failed to save permissions:', err);
      setSaveStatus({
        type: 'error',
        message: err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình quyền truy cập.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">
          Cấu Hình Hệ Thống
        </h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Quản lý cấu hình hệ thống, AI, chatbot và các cài đặt nâng cao khác
        </p>
      </div>

      {/* AI & Chatbot Permissions Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-slate-950/20 p-6 mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
              <span>🛠️</span> Quản Lý Quyền Truy Cập Công Cụ AI & Chatbot
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Cho phép hoặc chặn các nhóm người dùng sử dụng chatbot và các chức năng phân tích nâng cao.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !localPermissions}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg ${
              isSaving 
                ? 'bg-slate-700 cursor-not-allowed' 
                : 'bg-rose-600 hover:bg-rose-500 hover:scale-[1.02] cursor-pointer shadow-rose-950/30'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>💾 Lưu Cấu Hình</>
            )}
          </button>
        </div>

        {saveStatus && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-3 border transition-all ${
              saveStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
            }`}
          >
            <span>{saveStatus.type === 'success' ? '✅' : '⚠️'}</span>
            <p className="font-semibold">{saveStatus.message}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/30">
                <th className="py-4 px-6 font-bold uppercase tracking-wider text-slate-300 w-1/3">Tính năng / Công cụ</th>
                {ROLES.map(role => (
                  <th key={role.code} className="py-4 px-6 font-bold uppercase tracking-wider text-slate-300 text-center">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {localPermissions ? (
                localPermissions.map(p => (
                  <tr key={p.tool_code} className="hover:bg-slate-850/30 transition-colors">
                    <td className="py-4.5 px-6">
                      <span className="font-bold text-slate-200 block text-sm">{p.tool_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{p.tool_code}</span>
                    </td>
                    {ROLES.map(role => {
                      const isAllowed = p.allowed_roles.includes(role.code);
                      return (
                        <td key={role.code} className="py-4.5 px-6 text-center">
                          <div className="flex items-center justify-center">
                            <label className="relative inline-flex inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAllowed}
                                onChange={() => handleToggle(p.tool_code, role.code)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-rose-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    Đang tải danh sách phân quyền công cụ...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
