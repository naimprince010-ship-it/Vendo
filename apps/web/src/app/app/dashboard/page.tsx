import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { DashboardConsole } from '../reporting-console';

export default function DashboardPage() {
  return (
    <PermissionGate permissions={['report.view_sales']}>
      <DashboardConsole />
    </PermissionGate>
  );
}
