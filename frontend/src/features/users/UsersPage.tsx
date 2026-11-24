import React, { useState, useEffect } from 'react';
import { Plus, Shield, ShieldCheck, Lock, Trash2, Edit2, UserCheck } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole, AdminType } from '../../types';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { Input, Select } from '../../components/Form';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Password@123',
    role: UserRole.COUNSELLOR,
  });

  // Edit Team Member
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: UserRole.COUNSELLOR as UserRole,
    isActive: true,
    password: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const { success, error } = useToast();
  const { user: currentUser, isAdmin } = useAuth();
  const isEditingSelf = !!editingUser && editingUser._id === currentUser?._id;

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      isActive: u.isActive,
      password: '',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editForm.name.trim().length < 2) return error('Name must be at least 2 characters');
    if (!/^\S+@\S+\.\S+$/.test(editForm.email.trim())) return error('Enter a valid email address');
    if (editForm.password && editForm.password.length < 6) return error('New password must be at least 6 characters');

    setIsSavingEdit(true);
    try {
      await apiClient.put(`/users/${editingUser._id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        // Your own role and status can't be changed, so they aren't sent.
        ...(isEditingSelf ? {} : { role: editForm.role, isActive: editForm.isActive }),
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      success(`${editForm.name.trim()} updated successfully.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to update user');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Team management lists staff only; students have their own Students page.
      const res = await apiClient.get<User[]>('/users', { staffOnly: true, limit: 100 });
      setUsers(res.data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load team users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/users', form);
      success(`User ${form.name} created successfully.`);
      setIsModalOpen(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        password: 'Password@123',
        role: UserRole.COUNSELLOR,
      });
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await apiClient.delete(`/users/${selectedUser._id}`);
      success('User deleted successfully.');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Owner Admin cannot be deleted.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            User & Team Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage administrative staff, study abroad counsellors, and role permissions.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsModalOpen(true)}>
            Add Team Member
          </Button>
        )}
      </div>

      <Table
        columns={[
          {
            header: 'NAME & EMAIL',
            render: (u) => (
              <div>
                <strong>{u.name}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
            ),
          },
          { header: 'PHONE', accessor: 'phone' },
          {
            header: 'ROLE & PRIVILEGES',
            render: (u) => {
              if (u.role === UserRole.ADMIN) {
                if (u.adminType === AdminType.OWNER_ADMIN) {
                  return (
                    <Badge variant="primary">
                      <ShieldCheck size={12} /> OWNER ADMIN (PROTECTED)
                    </Badge>
                  );
                }
                return (
                  <Badge variant="info">
                    <Shield size={12} /> Administrator
                  </Badge>
                );
              }
              if (u.role === UserRole.COUNSELLOR) {
                return (
                  <Badge variant="success">
                    <UserCheck size={12} /> Counsellor
                  </Badge>
                );
              }
              return <Badge variant="neutral">{u.role}</Badge>;
            },
          },
          {
            header: 'STATUS',
            render: (u) => (
              <Badge variant={u.isActive ? 'success' : 'danger'}>
                {u.isActive ? 'Active' : 'Deactivated'}
              </Badge>
            ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (u) => {
              const isOwner = u.adminType === AdminType.OWNER_ADMIN;
              if (isOwner) {
                return (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Owner Admin is permanently protected by backend rules"
                  >
                    <Lock size={12} /> Locked Root Account
                  </span>
                );
              }

              return (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Edit User"
                    aria-label={`Edit ${u.name}`}
                    onClick={() => openEditModal(u)}
                    icon={<Edit2 size={14} color="var(--primary)" />}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete User"
                    onClick={() => {
                      setSelectedUser(u);
                      setIsDeleteOpen(true);
                    }}
                    icon={<Trash2 size={14} color="var(--danger)" />}
                  />
                </div>
              );
            },
          },
        ]}
        data={users}
        loading={loading}
      />

      {/* --- Add User Modal --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Team Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateUser}>
              Create User
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser}>
          <Input
            label="Full Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. John Doe"
            required
          />
          <Input
            label="Email Address *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="john@jaivacrm.com"
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Select
              label="System Role *"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              options={[
                { value: UserRole.COUNSELLOR, label: 'Counsellor' },
                { value: UserRole.ADMIN, label: 'CRM Administrator' },
              ]}
            />
          </div>
          <Input
            label="Default Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </form>
      </Modal>

      {/* --- Edit User Modal --- */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit Team Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateUser} loading={isSavingEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateUser}>
          <Input
            id="edit-user-name"
            label="Full Name *"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Input
            id="edit-user-email"
            label="Email Address *"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            helperText="This is the address they sign in with."
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              id="edit-user-phone"
              label="Phone Number"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Select
              id="edit-user-role"
              label="System Role *"
              value={editForm.role}
              disabled={isEditingSelf}
              title={isEditingSelf ? 'You cannot change your own role' : undefined}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
              options={[
                { value: UserRole.COUNSELLOR, label: 'Counsellor' },
                { value: UserRole.ADMIN, label: 'CRM Administrator' },
              ]}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              id="edit-user-status"
              label="Status"
              value={editForm.isActive ? 'active' : 'inactive'}
              disabled={isEditingSelf}
              title={isEditingSelf ? 'You cannot deactivate your own account' : undefined}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Deactivated' },
              ]}
            />
            <Input
              id="edit-user-password"
              label="New Password"
              type="password"
              autoComplete="new-password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />
          </div>
        </form>
      </Modal>

      {/* --- Delete Confirm Dialog --- */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete Team User"
        message={`Are you sure you want to delete ${selectedUser?.name}?`}
        isDanger
        confirmText="Delete"
      />
    </div>
  );
};
