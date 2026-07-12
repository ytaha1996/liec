import { useState } from 'react';
import { toast } from 'sonner';
import { MainPageTitle, MainPageSection } from '@/components/layout';
import { InformationWidget, InformationWidgetFieldTypes, type IInformationWidgetField } from '@/components/information-widget';
import { GenericInput } from '@/components/inputs';
import { Button } from '@/components/ui/button';
import { putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAppSelector } from '@/redux/hooks';

const INFO_FIELDS: IInformationWidgetField[] = [
  { type: InformationWidgetFieldTypes.Text, name: 'username', title: 'Username' },
  { type: InformationWidgetFieldTypes.Text, name: 'email', title: 'Email' },
  { type: InformationWidgetFieldTypes.Text, name: 'role', title: 'Role' },
];

export default function ProfilePage() {
  usePageTitle('Profile');
  const user = useAppSelector((s) => s.user);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('Both fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await putJson('/api/auth/change-password', { oldPassword, newPassword });
      toast.success('Password updated');
      setOldPassword('');
      setNewPassword('');
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  const data = { ...user.user, role: user.role };

  return (
    <>
      <MainPageTitle title="Profile" />
      <div className="px-4 sm:px-6 pb-6 space-y-4">
        <InformationWidget title="Account" fields={INFO_FIELDS} data={data as never} />
        <MainPageSection title="Change Password">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl"
          >
            <GenericInput
              name="oldPassword"
              title="Old Password"
              type="password"
              value={oldPassword}
              onChange={setOldPassword}
              required
            />
            <GenericInput
              name="newPassword"
              title="New Password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              required
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                Update Password
              </Button>
            </div>
          </form>
        </MainPageSection>
      </div>
    </>
  );
}
