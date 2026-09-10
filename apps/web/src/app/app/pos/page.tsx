import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { PosConsole } from '../pos-console';

export default function PosPage() {
  return (
    <PermissionGate permissions={['sale.create']}>
      <PosConsole />
    </PermissionGate>
  );
}
