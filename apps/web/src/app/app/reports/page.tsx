import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { ReportsConsole } from '../reporting-console';

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
      <ReportsConsole />
    </PermissionGate>
  );
}
