import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { SalesWorkspace } from '../../../features/sales/sales-workspace';

export default function SalesPage() {
  return (
    <PermissionGate permissions={['sale.view']}>
      <SalesWorkspace />
    </PermissionGate>
  );
}
