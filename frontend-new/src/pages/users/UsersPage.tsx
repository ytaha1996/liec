import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { TableSkeleton } from '@/components/feedback';
import { getJson, postJson, putJson, deleteJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canManageUsers } from '@/helpers/rbac';
import { decodeUserIdFromToken, getUserToken } from '@/helpers/user-token';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';

const ROLE_ITEMS = {
  Admin: 'Admin',
  Manager: 'Manager',
  Accountant: 'Accountant',
  Field: 'Field',
};

const ROLE_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Admin: { color: '#fff', backgroundColor: '#c62828' },
  Manager: { color: '#fff', backgroundColor: '#1565c0' },
  Accountant: { color: '#fff', backgroundColor: '#7b1fa2' },
  Field: { color: '#fff', backgroundColor: '#2e7d32' },
};

interface User {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
}

const buildFields = (initial: Partial<User> | null, isEditing: boolean): FieldMap => ({
  email: {
    type: DynamicField.EMAIL,
    name: 'email',
    title: 'Email',
    required: true,
    value: initial?.email ?? '',
    grid: { sm: 6, md: 6 },
  },
  password: {
    type: DynamicField.TEXT,
    name: 'password',
    title: isEditing ? 'New Password (blank = keep)' : 'Password (min 8 chars)',
    required: !isEditing,
    value: '',
    grid: { sm: 6, md: 6 },
  },
  role: {
    type: DynamicField.SELECT,
    name: 'role',
    title: 'Role',
    required: true,
    items: ROLE_ITEMS,
    value: initial?.role ?? 'Field',
    grid: { sm: 6, md: 6 },
  },
  isActive: {
    type: DynamicField.CHECKBOX,
    name: 'isActive',
    title: 'Active',
    value: initial?.isActive ?? true,
    grid: { sm: 6, md: 6 },
  },
});

export default function UsersPage() {
  usePageTitle('Users');
  const role = useUserRole();
  const isAdmin = canManageUsers(role);
  const dispatch = useAppDispatch();
  const currentUserId = decodeUserIdFromToken(getUserToken() ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const users = useLoader<User[]>(() => getJson<User[]>('/api/users'));
  const { initializing } = useInitializeFunction([users.reload]);

  const save = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          email: values.email,
          role: values.role,
          isActive: values.isActive,
        };
        if (values.password) body.password = values.password;
        await putJson(`/api/users/${editing.id}`, body);
      } else {
        await postJson('/api/users', values);
      }
      toast.success('User saved');
      setDialogOpen(false);
      setEditing(null);
      await users.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const remove = (user: User) => {
    dispatch(
      OpenConfirmation({
        title: 'Delete User',
        message: `Permanently delete user "${user.email}"? This cannot be undone.`,
        destructive: true,
        confirmText: 'Delete',
        onSubmit: async () => {
          try {
            await deleteJson(`/api/users/${user.id}`);
            toast.success('User deleted');
            await users.reload();
          } catch (e) {
            toast.error(parseApiError(e).message);
          }
        },
      }),
    );
  };

  const tableData = (users.data ?? []).reduce<Record<string, Omit<User, 'isActive'> & { isActive: string }>>(
    (acc, u) => {
      acc[String(u.id)] = { ...u, isActive: String(u.isActive) };
      return acc;
    },
    {},
  );

  const headers: EnhanceTableHeaderTypes[] = [
    { id: 'email', label: 'Email', type: EnhancedTableColumnType.TEXT },
    {
      id: 'role',
      label: 'Role',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: ROLE_CHIPS,
      chipLabels: {},
    },
    {
      id: 'isActive',
      label: 'Active',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#fff', backgroundColor: '#9e9e9e' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
    { id: 'lastLoginAt', label: 'Last Login', type: EnhancedTableColumnType.DATETIME },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            label: 'Actions',
            type: EnhancedTableColumnType.Action,
            actions: [
              {
                icon: <Pencil className="size-4" />,
                label: 'Edit',
                onClick: (_id: string, row: Record<string, unknown>) => {
                  setEditing(row as unknown as User);
                  setDialogOpen(true);
                },
              },
              {
                icon: <Trash2 className="size-4" />,
                label: 'Delete',
                onClick: (_id: string, row: Record<string, unknown>) => {
                  remove(row as unknown as User);
                },
                hidden: (row: Record<string, unknown>) => Number(row.id) === currentUserId,
              },
            ],
          } as EnhanceTableHeaderTypes,
        ]
      : []),
  ];

  return (
    <>
      <MainPageTitle
        title="Users"
        action={
          isAdmin
            ? {
                title: 'Create User',
                onClick: () => {
                  setEditing(null);
                  setDialogOpen(true);
                },
              }
            : undefined
        }
      />
      <div className="px-4 sm:px-6 pb-6">
        {initializing ? (
          <TableSkeleton rows={6} columns={4} />
        ) : (
          <EnhancedTable
            title="Users"
            header={headers}
            data={tableData as never}
            defaultOrder="email"
            defaultDirection="asc"
          />
        )}
      </div>

      {isAdmin && (
        <GenericDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          title={editing ? 'Edit User' : 'Create User'}
        >
          <DynamicFormWidget
            fields={buildFields(editing, !!editing)}
            onSubmit={save}
            drawerMode
          />
        </GenericDialog>
      )}
    </>
  );
}
