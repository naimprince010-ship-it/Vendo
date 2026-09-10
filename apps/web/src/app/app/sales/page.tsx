import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { Phase10Console } from '../phase10-console';

export default function SalesPage() {
  return (
    <PermissionGate permissions={['sale.view']}>
      <Phase10Console />
    </PermissionGate>
  );
}
