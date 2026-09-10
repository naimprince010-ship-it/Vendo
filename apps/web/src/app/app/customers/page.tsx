import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { PartiesConsole } from '../parties-console';

export default function CustomersPage() {
  return (
    <PermissionGate permissions={['customer.view']}>
      <PartiesConsole />
    </PermissionGate>
  );
}
