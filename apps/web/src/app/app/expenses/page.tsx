import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { CashConsole } from '../cash-console';

export default function ExpensesPage() {
  return (
    <PermissionGate permissions={['expense.view']}>
      <CashConsole />
    </PermissionGate>
  );
}
