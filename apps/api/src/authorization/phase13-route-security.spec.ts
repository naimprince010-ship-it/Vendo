import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import ts from 'typescript';

const sourceRoot = join(process.cwd(), 'src');

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? filesBelow(path)
      : entry.name.endsWith('.controller.ts')
        ? [path]
        : [];
  });
}

function decoratorNames(node: ts.Node): string[] {
  if (!ts.canHaveDecorators(node)) return [];
  return (ts.getDecorators(node) ?? []).map((decorator) => {
    const expression = decorator.expression;
    return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
      ? expression.expression.text
      : ts.isIdentifier(expression)
        ? expression.text
        : '';
  });
}

describe('Phase 13 route security inventory', () => {
  const controllers = filesBelow(sourceRoot);
  const selfService = new Set([
    'AuthController.login',
    'AuthController.refresh',
    'AuthController.me',
    'AuthController.logout',
    'AuthController.logoutOthers',
    'AuthController.changePassword',
    'AuthController.requestPasswordReset',
    'AuthController.completePasswordReset',
    'HealthController.getHealth',
    'HealthController.getReadiness',
    'BranchesController.activeContext',
    // Export kind selects and enforces its granular report permission in ReportsService.
    'ReportsController.export',
  ]);

  it('requires a declared permission or an explicit reviewed self-service exception on every route', () => {
    const uncovered: string[] = [];
    let routeCount = 0;
    for (const file of controllers) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      source.forEachChild((node) => {
        if (!ts.isClassDeclaration(node) || !node.name) return;
        const classDecorators = decoratorNames(node);
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name))
            continue;
          const decorators = decoratorNames(member);
          if (!decorators.some((name) => ['Get', 'Post', 'Put', 'Patch', 'Delete'].includes(name)))
            continue;
          routeCount += 1;
          const identity = `${node.name.text}.${member.name.text}`;
          const protectedRoute = [...classDecorators, ...decorators].includes('RequirePermissions');
          if (!protectedRoute && !selfService.has(identity))
            uncovered.push(`${basename(file)}:${identity}`);
        }
      });
    }
    expect(routeCount).toBeGreaterThan(140);
    expect(uncovered).toEqual([]);
  });

  it('keeps public routes restricted to reviewed authentication and health operations', () => {
    const publicDeclarations = controllers.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return source.includes('@Public()') ? [basename(file)] : [];
    });
    expect(publicDeclarations.sort()).toEqual(['auth.controller.ts', 'health.controller.ts']);
  });

  it('applies active-branch validation to every operational controller', () => {
    for (const relative of [
      'cash/cash.controller.ts',
      'inventory/inventory.controller.ts',
      'purchasing/purchasing.controller.ts',
      'reports/reports.controller.ts',
      'sales/sales.controller.ts',
    ]) {
      expect(readFileSync(join(sourceRoot, relative), 'utf8')).toContain(
        '@UseGuards(ActiveBranchGuard)',
      );
    }
  });

  it('retains audit events for every critical mutation family without credential fields', () => {
    const services = filesBelow(sourceRoot)
      .map((file) => file.replace('.controller.ts', '.service.ts'))
      .filter((file) => {
        try {
          return readFileSync(file, 'utf8').length > 0;
        } catch {
          return false;
        }
      })
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    for (const action of [
      'auth.login.success',
      'user.role.assigned',
      'role.permissions.changed',
      'company.updated',
      'product.price.changed',
      'purchase.receipt.posted',
      'purchase.invoice.posted',
      'supplier.payment.posted',
      'sale.completed',
      'sale.discount.applied',
      'sale.price.overridden',
      'sale.return.posted',
      'sale.refund.posted',
      'sale.exchange.posted',
      'sale.voided',
      'customer.collection.posted',
      'cash.shift.closed',
      'expense.posted',
    ]) {
      expect(services).toContain(action);
    }
    expect(services).toContain('inventory.${operationType.toLowerCase()}.posted');
    expect(services).not.toMatch(/newValue:\s*\{[^}]*password/i);
    expect(services).not.toMatch(/newValue:\s*\{[^}]*(refreshToken|JWT_ACCESS_SECRET)/i);
  });
});
