import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { InventoryConsole } from '../inventory-console';

export default function InventoryPage() {
  return (
    <PermissionGate permissions={['inventory.view']}>
      <InventoryConsole />
    </PermissionGate>
  );
}
