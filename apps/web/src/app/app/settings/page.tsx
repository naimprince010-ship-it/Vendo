import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { OrganizationConsole } from '../organization-console';

const settingsPermissions = [
  'company.view',
  'branch.view',
  'warehouse.view',
  'register.view',
  'user.view',
  'role.view',
];

export default function SettingsPage() {
  return (
    <PermissionGate permissions={settingsPermissions}>
      <OrganizationConsole />
    </PermissionGate>
  );
}
