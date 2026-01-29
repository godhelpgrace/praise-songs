'use client';

import { useState, useEffect } from 'react';
import { Search, Edit2, Check, X, Shield, ShieldAlert, ShieldCheck, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

type User = {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  permissions: string; // JSON string
  createdAt: string;
};

type Permissions = {
  upload: boolean;
  edit: boolean;
  delete: 'self' | 'all' | 'none';
  download: boolean;
  view_private: boolean;
  admin_panel: boolean;
};

const DEFAULT_PERMISSIONS: Permissions = {
  upload: true,
  edit: true,
  delete: 'self',
  download: true,
  view_private: false,
  admin_panel: false
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<{ role: string; permissions: Permissions }>({
    role: 'user',
    permissions: DEFAULT_PERMISSIONS
  });

  // Add State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'user',
    permissions: DEFAULT_PERMISSIONS
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (e) {
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    let perms = DEFAULT_PERMISSIONS;
    try {
      perms = { ...DEFAULT_PERMISSIONS, ...JSON.parse(user.permissions || '{}') };
    } catch {}

    setEditingUser(user);
    setEditForm({
      role: user.role,
      permissions: perms
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/user/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editForm.role,
          permissions: editForm.permissions
        })
      });

      if (res.ok) {
        toast.success('User updated successfully');
        setEditingUser(null);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Update failed');
      }
    } catch (e) {
      toast.error('Update failed');
    }
  };

  const handleAdd = async () => {
    if (!addForm.username || !addForm.password) {
      toast.error('用户名和密码不能为空');
      return;
    }

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });

      if (res.ok) {
        toast.success('用户创建成功');
        setShowAddModal(false);
        setAddForm({
          username: '',
          password: '',
          email: '',
          phone: '',
          role: 'user',
          permissions: DEFAULT_PERMISSIONS
        });
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || '创建失败');
      }
    } catch (e) {
      toast.error('创建失败');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">用户管理</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户..."
              className="bg-muted/30 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-64"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            <span>添加用户</span>
          </button>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-muted-foreground">
          <thead className="bg-muted/50 text-foreground font-medium">
            <tr>
              <th className="px-6 py-4">用户名</th>
              <th className="px-6 py-4">角色</th>
              <th className="px-6 py-4">联系方式</th>
              <th className="px-6 py-4">注册时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
               <tr><td colSpan={5} className="px-6 py-8 text-center">加载中...</td></tr>
            ) : filteredUsers.length === 0 ? (
               <tr><td colSpan={5} className="px-6 py-8 text-center">未找到用户</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-foreground font-medium">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/20 text-primary text-xs border border-primary/20">
                        <ShieldCheck size={12} /> 管理员
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-muted-foreground text-xs border border-border">
                        <UserIcon role={user.role} /> 普通用户
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      {user.email && <span>{user.email}</span>}
                      {user.phone && <span>{user.phone}</span>}
                      {!user.email && !user.phone && <span className="text-muted-foreground">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-popover border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">编辑用户: {editingUser.username}</h2>
              <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">角色</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${editForm.role === 'user' ? 'bg-primary/20 border-primary text-foreground' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="user" 
                      checked={editForm.role === 'user'} 
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="hidden" 
                    />
                    <span className="text-sm font-medium">普通用户</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${editForm.role === 'admin' ? 'bg-primary/20 border-primary text-foreground' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="admin" 
                      checked={editForm.role === 'admin'} 
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="hidden" 
                    />
                    <ShieldCheck size={16} />
                    <span className="text-sm font-medium">管理员</span>
                  </label>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-3">详细权限</label>
                <div className="grid grid-cols-2 gap-3">
                  <PermissionToggle 
                    label="允许上传" 
                    checked={editForm.permissions.upload} 
                    onChange={(v) => setEditForm({ ...editForm, permissions: { ...editForm.permissions, upload: v } })} 
                  />
                  <PermissionToggle 
                    label="允许编辑" 
                    checked={editForm.permissions.edit} 
                    onChange={(v) => setEditForm({ ...editForm, permissions: { ...editForm.permissions, edit: v } })} 
                  />
                  <PermissionToggle 
                    label="允许下载" 
                    checked={editForm.permissions.download} 
                    onChange={(v) => setEditForm({ ...editForm, permissions: { ...editForm.permissions, download: v } })} 
                  />
                  <PermissionToggle 
                    label="查看私有歌单" 
                    checked={editForm.permissions.view_private} 
                    onChange={(v) => setEditForm({ ...editForm, permissions: { ...editForm.permissions, view_private: v } })} 
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-xs text-muted-foreground mb-2">删除权限</label>
                  <select 
                    value={editForm.permissions.delete}
                    onChange={(e) => setEditForm({ ...editForm, permissions: { ...editForm.permissions, delete: e.target.value as any } })}
                    className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="none">禁止删除</option>
                    <option value="self">仅限自己创建</option>
                    <option value="all">所有 (管理员)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
                >
                  保存更改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-popover border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">添加新用户</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">用户名 <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={addForm.username}
                    onChange={(e) => setAddForm({...addForm, username: e.target.value})}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">密码 <span className="text-destructive">*</span></label>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({...addForm, password: e.target.value})}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">邮箱</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">手机号</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">角色</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${addForm.role === 'user' ? 'bg-primary/20 border-primary text-foreground' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="add_role" 
                      value="user" 
                      checked={addForm.role === 'user'} 
                      onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                      className="hidden" 
                    />
                    <span className="text-sm font-medium">普通用户</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${addForm.role === 'admin' ? 'bg-primary/20 border-primary text-foreground' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="add_role" 
                      value="admin" 
                      checked={addForm.role === 'admin'} 
                      onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                      className="hidden" 
                    />
                    <ShieldCheck size={16} />
                    <span className="text-sm font-medium">管理员</span>
                  </label>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-3">详细权限</label>
                <div className="grid grid-cols-2 gap-3">
                  <PermissionToggle 
                    label="允许上传" 
                    checked={addForm.permissions.upload} 
                    onChange={(v) => setAddForm({ ...addForm, permissions: { ...addForm.permissions, upload: v } })} 
                  />
                  <PermissionToggle 
                    label="允许编辑" 
                    checked={addForm.permissions.edit} 
                    onChange={(v) => setAddForm({ ...addForm, permissions: { ...addForm.permissions, edit: v } })} 
                  />
                  <PermissionToggle 
                    label="允许下载" 
                    checked={addForm.permissions.download} 
                    onChange={(v) => setAddForm({ ...addForm, permissions: { ...addForm.permissions, download: v } })} 
                  />
                  <PermissionToggle 
                    label="查看私有歌单" 
                    checked={addForm.permissions.view_private} 
                    onChange={(v) => setAddForm({ ...addForm, permissions: { ...addForm.permissions, view_private: v } })} 
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-xs text-muted-foreground mb-2">删除权限</label>
                  <select 
                    value={addForm.permissions.delete}
                    onChange={(e) => setAddForm({ ...addForm, permissions: { ...addForm.permissions, delete: e.target.value as any } })}
                    className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="none">禁止删除</option>
                    <option value="self">仅限自己创建</option>
                    <option value="all">所有 (管理员)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleAdd}
                  className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
                >
                  创建用户
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserIcon({ role }: { role: string }) {
  return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
}

function PermissionToggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary/50' : 'bg-muted/30 border-border hover:bg-muted/50'}`}>
      <span className={`text-sm ${checked ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
      <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-background transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="hidden" />
    </label>
  );
}
