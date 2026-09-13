import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { ReportsWorkspace } from '../../../features/reporting/reporting-workspace';

const reportPermissions = [
  'report.view_sales',
  'report.view_inventory',
  'report.view_purchases',
  'report.view_customers',
  'report.view_suppliers',
  'report.view_expenses',
  'report.view_cash',
];

export default function ReportsPage() {
  return (
    <PermissionGate permissions={reportPermissions}>
      <ReportsWorkspace />
    </PermissionGate>
  );
}
