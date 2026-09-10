import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { CashConsole } from '../cash-console';

export default function CashPage() {
  return (
    <PermissionGate permissions={['cash.view_shift', 'cash.view_history']}>
      <CashConsole />
    </PermissionGate>
  );
}
