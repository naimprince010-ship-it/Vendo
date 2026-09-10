import { PermissionGate } from '../../../components/app-shell/permission-gate';
import { CatalogConsole } from '../catalog-console';

export default function ProductsPage() {
  return (
    <PermissionGate permissions={['product.view']}>
      <CatalogConsole />
    </PermissionGate>
  );
}
