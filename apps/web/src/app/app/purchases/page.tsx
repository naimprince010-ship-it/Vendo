import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { PurchasingConsole } from '../purchasing-console';

export default function PurchasesPage() {
  return (
    <PermissionGate permissions={['purchase.view']}>
      <PurchasingConsole />
    </PermissionGate>
  );
}
