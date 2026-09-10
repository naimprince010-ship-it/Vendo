import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { PartiesConsole } from '../parties-console';

export default function SuppliersPage() {
  return (
    <PermissionGate permissions={['supplier.view']}>
      <PartiesConsole />
    </PermissionGate>
  );
}
