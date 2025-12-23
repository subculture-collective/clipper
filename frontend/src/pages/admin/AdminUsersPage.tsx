import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Card, CardHeader, CardBody, Button, Input } from '../../components';
import { Search, Shield, Ban, Edit, TrendingUp } from 'lucide-react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string;
  role: string;
  karma_points: number;
  is_banned: boolean;
  created_at: string;
  last_login_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
}

interface UserActionModalProps {
  user: User;
  actionType: 'ban' | 'unban' | 'promote' | 'demote' | 'karma';
  onClose: () => void;
  onConfirm: (reason?: string, value?: number) => void;
}

function UserActionModal({ user, actionType, onClose, onConfirm }: UserActionModalProps) {
  const [reason, setReason] = useState('');
  const [karmaValue, setKarmaValue] = useState(user.karma_points);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionType === 'karma') {
      onConfirm(undefined, karmaValue);
    } else {
      onConfirm(reason);
    }
  };

  const titles = {
    ban: 'Ban User',
    unban: 'Unban User',
    promote: 'Promote User',
    demote: 'Demote User',
    karma: 'Adjust Karma Points'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <h3 className="text-xl font-semibold">{titles[actionType]}</h3>
          <p className="text-sm text-muted-foreground">
            User: {user.username} ({user.email})
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {actionType === 'karma' ? (
              <div>
                <label className="block text-sm font-medium mb-2">
                  New Karma Points
                </label>
                <Input
                  type="number"
                  value={karmaValue}
                  onChange={(e) => setKarmaValue(parseInt(e.target.value) || 0)}
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {user.karma_points} points
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {actionType === 'ban' ? 'Ban Reason' : 'Action Reason'}
                  {actionType === 'ban' && ' (Required)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 border border-border rounded-md min-h-[100px] bg-background"
                  placeholder={`Enter reason for ${actionType}...`}
                  required={actionType === 'ban'}
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button type="submit" variant={actionType === 'ban' ? 'destructive' : 'primary'}>
                Confirm
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'unban' | 'promote' | 'demote' | 'karma' | null>(null);
  
  const queryClient = useQueryClient();
  const perPage = 25;

  // Fetch users
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['admin-users', search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await axios.get(`/api/v1/admin/users?${params.toString()}`);
      return response.data;
    },
  });

  // Ban user mutation
  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await axios.post(`/api/v1/admin/users/${userId}/ban`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      setActionType(null);
    },
  });

  // Unban user mutation
  const unbanMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      await axios.post(`/api/v1/admin/users/${userId}/unban`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      setActionType(null);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, reason }: { userId: string; role: string; reason?: string }) => {
      await axios.patch(`/api/v1/admin/users/${userId}/role`, { role, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      setActionType(null);
    },
  });

  // Update karma mutation
  const updateKarmaMutation = useMutation({
    mutationFn: async ({ userId, karma }: { userId: string; karma: number }) => {
      await axios.patch(`/api/v1/admin/users/${userId}/karma`, { karma_points: karma });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      setActionType(null);
    },
  });

  const handleAction = (user: User, action: 'ban' | 'unban' | 'promote' | 'demote' | 'karma') => {
    setSelectedUser(user);
    setActionType(action);
  };

  const handleConfirmAction = (reason?: string, value?: number) => {
    if (!selectedUser) return;

    if (actionType === 'ban') {
      banMutation.mutate({ userId: selectedUser.id, reason: reason || '' });
    } else if (actionType === 'unban') {
      unbanMutation.mutate({ userId: selectedUser.id, reason });
    } else if (actionType === 'promote') {
      const newRole = selectedUser.role === 'user' ? 'moderator' : 'admin';
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole, reason });
    } else if (actionType === 'demote') {
      const newRole = selectedUser.role === 'admin' ? 'moderator' : 'user';
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole, reason });
    } else if (actionType === 'karma' && value !== undefined) {
      updateKarmaMutation.mutate({ userId: selectedUser.id, karma: value });
    }
  };

  const totalPages = data ? Math.ceil(data.total / perPage) : 0;

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by username, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{data.total}</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On This Page</p>
                <p className="text-2xl font-bold">{data.users.length}</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Page</p>
                <p className="text-2xl font-bold">{page} / {totalPages}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Users</h2>
        </CardHeader>
        <CardBody>
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              <p className="font-bold">Error loading users</p>
              <p>Please try again later.</p>
            </div>
          )}

          {data && data.users.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found matching your criteria.</p>
            </div>
          )}

          {data && data.users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Karma</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Joined</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-accent">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {user.avatar_url && (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium">{user.username}</p>
                            {user.display_name && (
                              <p className="text-xs text-muted-foreground">{user.display_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{user.email}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400'
                              : user.role === 'moderator'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {user.role === 'admin' || user.role === 'moderator' ? (
                            <Shield className="w-3 h-3" />
                          ) : null}
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{user.karma_points}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            user.is_banned
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {user.is_banned ? (
                            <>
                              <Ban className="w-3 h-3" />
                              Banned
                            </>
                          ) : (
                            'Active'
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(user, 'karma')}
                            title="Adjust Karma"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleAction(user, user.role === 'user' ? 'promote' : 'demote')
                            }
                            title={user.role === 'user' ? 'Promote' : 'Demote'}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(user, user.is_banned ? 'unban' : 'ban')}
                            title={user.is_banned ? 'Unban' : 'Ban'}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Action Modal */}
      {selectedUser && actionType && (
        <UserActionModal
          user={selectedUser}
          actionType={actionType}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          onConfirm={handleConfirmAction}
        />
      )}
    </Container>
  );
}
