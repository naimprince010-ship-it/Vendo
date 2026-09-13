import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { DashboardWorkspace } from '../../../features/reporting/reporting-workspace';

export default function DashboardPage() {
  return (
    <PermissionGate permissions={['report.view_sales']}>
      <DashboardWorkspace />
    </PermissionGate>
  );
}
