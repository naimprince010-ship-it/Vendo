import { PermissionGate } from '../../../../components/app-shell/permission-gate';
import { SaleDetailWorkspace } from '../../../../features/sales/sale-detail-workspace';

export default async function SaleDetailPage({ params }: PageProps<'/app/sales/[saleId]'>) {
  const { saleId } = await params;
  return (
    <PermissionGate permissions={['sale.view']}>
      <SaleDetailWorkspace saleId={saleId} />
    </PermissionGate>
  );
}
