-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('TILE', 'SANITARY', 'ACCESSORY', 'GENERAL');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('RETAIL', 'WHOLESALE', 'MINIMUM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'HELD', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('OPENING', 'PURCHASE_RECEIPT', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT', 'DAMAGE', 'LOSS', 'TRANSFER_OUT', 'TRANSFER_IN', 'COUNT_RECONCILIATION');

-- CreateEnum
CREATE TYPE "CashShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('OPENING', 'CASH_SALE', 'CASH_REFUND', 'CASH_IN', 'CASH_OUT', 'EXPENSE', 'CLOSING_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SettingScope" AS ENUM ('COMPANY', 'BRANCH');

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "legalName" VARCHAR(200),
    "phone" VARCHAR(40),
    "email" VARCHAR(254),
    "address" TEXT,
    "countryCode" CHAR(2) NOT NULL DEFAULT 'BD',
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'BDT',
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Dhaka',
    "negativeStockAllowed" BOOLEAN NOT NULL DEFAULT false,
    "quantityScale" INTEGER NOT NULL DEFAULT 6,
    "moneyScale" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(40),
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Register" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100),
    "phone" VARCHAR(40),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "companyId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "UserBranch" (
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "branchId" UUID NOT NULL,

    CONSTRAINT "UserBranch_pkey" PRIMARY KEY ("userId","branchId")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "decimalScale" INTEGER NOT NULL DEFAULT 6,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "parentId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "categoryId" UUID,
    "brandId" UUID,
    "baseUnitId" UUID NOT NULL,
    "type" "ProductType" NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "model" VARCHAR(120),
    "manufacturer" VARCHAR(160),
    "description" TEXT,
    "standardCost" DECIMAL(19,4),
    "reorderLevel" DECIMAL(20,6),
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "batchTracking" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTileProfile" (
    "productId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "widthMm" DECIMAL(12,3) NOT NULL,
    "heightMm" DECIMAL(12,3) NOT NULL,
    "thicknessMm" DECIMAL(10,3),
    "displaySize" VARCHAR(80),
    "series" VARCHAR(120),
    "finish" VARCHAR(80),
    "surface" VARCHAR(80),
    "color" VARCHAR(80),
    "grade" VARCHAR(40),
    "countryOfOrigin" CHAR(2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductTileProfile_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "ProductBarcode" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "barcode" VARCHAR(120) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitConversion" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "fromUnitId" UUID NOT NULL,
    "factorToBase" DECIMAL(24,10) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "type" "PriceType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "supplierId" UUID,
    "batchNumber" VARCHAR(100) NOT NULL,
    "lotNumber" VARCHAR(100),
    "shade" VARCHAR(80),
    "receivedAt" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerGroup" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "groupId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(254),
    "address" TEXT,
    "creditLimit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "openingBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "contactName" VARCHAR(120),
    "phone" VARCHAR(40),
    "email" VARCHAR(254),
    "address" TEXT,
    "openingBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "orderNumber" VARCHAR(60) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" DATE NOT NULL,
    "expectedAt" DATE,
    "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "freight" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "baseQuantity" DECIMAL(20,6) NOT NULL,
    "conversionFactor" DECIMAL(24,10) NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "orderId" UUID,
    "receivedById" UUID NOT NULL,
    "receiptNumber" VARCHAR(60) NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "receiptId" UUID NOT NULL,
    "orderItemId" UUID,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "batchId" UUID,
    "quantity" DECIMAL(20,6) NOT NULL,
    "baseQuantity" DECIMAL(20,6) NOT NULL,
    "conversionFactor" DECIMAL(24,10) NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "receiptId" UUID,
    "invoiceNumber" VARCHAR(80) NOT NULL,
    "supplierInvoiceNumber" VARCHAR(100),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE,
    "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "freight" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "additionalCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "receiptItemId" UUID,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "baseQuantity" DECIMAL(20,6) NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "registerId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "invoiceNumber" VARCHAR(60) NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "saleDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "paid" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "due" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "change" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "batchId" UUID,
    "quantity" DECIMAL(20,6) NOT NULL,
    "baseQuantity" DECIMAL(20,6) NOT NULL,
    "conversionFactor" DECIMAL(24,10) NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isCash" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "methodId" UUID NOT NULL,
    "customerId" UUID,
    "supplierId" UUID,
    "recordedById" UUID NOT NULL,
    "paymentNumber" VARCHAR(60) NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "amount" DECIMAL(19,4) NOT NULL,
    "reference" VARCHAR(160),
    "paidAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "companyId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("saleId","paymentId")
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "companyId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("invoiceId","paymentId")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchId" UUID,
    "unitId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "baseQuantity" DECIMAL(20,6) NOT NULL,
    "transactionQuantity" DECIMAL(20,6) NOT NULL,
    "conversionFactor" DECIMAL(24,10) NOT NULL,
    "unitCost" DECIMAL(19,4),
    "referenceType" VARCHAR(60) NOT NULL,
    "referenceId" UUID NOT NULL,
    "correlationId" UUID,
    "reason" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchId" UUID,
    "baseQuantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashShift" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "registerId" UUID NOT NULL,
    "cashierId" UUID NOT NULL,
    "status" "CashShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "openingCash" DECIMAL(19,4) NOT NULL,
    "expectedCash" DECIMAL(19,4),
    "actualCash" DECIMAL(19,4),
    "variance" DECIMAL(19,4),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CashShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "paymentId" UUID,
    "recordedById" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "referenceType" VARCHAR(60),
    "referenceId" UUID,
    "reason" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "paymentMethodId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "expenseNumber" VARCHAR(60) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "expenseDate" DATE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID,
    "scope" "SettingScope" NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID,
    "actorId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID NOT NULL,
    "reason" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" INET,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Company_id_code_key" ON "Company"("id", "code");

-- CreateIndex
CREATE INDEX "Branch_companyId_isActive_idx" ON "Branch"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_companyId_code_key" ON "Branch"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_id_companyId_key" ON "Branch"("id", "companyId");

-- CreateIndex
CREATE INDEX "Warehouse_branchId_isActive_idx" ON "Warehouse"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_companyId_code_key" ON "Warehouse"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_id_companyId_key" ON "Warehouse"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_id_branchId_companyId_key" ON "Warehouse"("id", "branchId", "companyId");

-- CreateIndex
CREATE INDEX "Register_branchId_isActive_idx" ON "Register"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Register_companyId_code_key" ON "Register"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Register_id_companyId_key" ON "Register"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Register_id_branchId_companyId_key" ON "Register"("id", "branchId", "companyId");

-- CreateIndex
CREATE INDEX "User_companyId_status_idx" ON "User"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_email_key" ON "User"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_companyId_key" ON "User"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_companyId_key_key" ON "Role"("companyId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Role_id_companyId_key" ON "Role"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_companyId_permissionId_idx" ON "RolePermission"("companyId", "permissionId");

-- CreateIndex
CREATE INDEX "UserRole_companyId_roleId_idx" ON "UserRole"("companyId", "roleId");

-- CreateIndex
CREATE INDEX "UserBranch_companyId_branchId_idx" ON "UserBranch"("companyId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_companyId_code_key" ON "Unit"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_id_companyId_key" ON "Unit"("id", "companyId");

-- CreateIndex
CREATE INDEX "Category_companyId_parentId_isActive_idx" ON "Category"("companyId", "parentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Category_companyId_slug_key" ON "Category"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_id_companyId_key" ON "Category"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_companyId_slug_key" ON "Brand"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_id_companyId_key" ON "Brand"("id", "companyId");

-- CreateIndex
CREATE INDEX "Product_companyId_name_idx" ON "Product"("companyId", "name");

-- CreateIndex
CREATE INDEX "Product_companyId_model_idx" ON "Product"("companyId", "model");

-- CreateIndex
CREATE INDEX "Product_companyId_brandId_isActive_idx" ON "Product"("companyId", "brandId", "isActive");

-- CreateIndex
CREATE INDEX "Product_companyId_categoryId_isActive_idx" ON "Product"("companyId", "categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_companyId_key" ON "Product"("id", "companyId");

-- CreateIndex
CREATE INDEX "ProductTileProfile_companyId_widthMm_heightMm_idx" ON "ProductTileProfile"("companyId", "widthMm", "heightMm");

-- CreateIndex
CREATE INDEX "ProductTileProfile_companyId_series_idx" ON "ProductTileProfile"("companyId", "series");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTileProfile_productId_companyId_key" ON "ProductTileProfile"("productId", "companyId");

-- CreateIndex
CREATE INDEX "ProductBarcode_productId_idx" ON "ProductBarcode"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcode_companyId_barcode_key" ON "ProductBarcode"("companyId", "barcode");

-- CreateIndex
CREATE INDEX "UnitConversion_companyId_productId_isActive_idx" ON "UnitConversion"("companyId", "productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UnitConversion_companyId_productId_fromUnitId_version_key" ON "UnitConversion"("companyId", "productId", "fromUnitId", "version");

-- CreateIndex
CREATE INDEX "ProductPrice_companyId_productId_isActive_idx" ON "ProductPrice"("companyId", "productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_companyId_productId_unitId_type_key" ON "ProductPrice"("companyId", "productId", "unitId", "type");

-- CreateIndex
CREATE INDEX "ProductBatch_companyId_productId_batchNumber_lotNumber_shad_idx" ON "ProductBatch"("companyId", "productId", "batchNumber", "lotNumber", "shade");

-- CreateIndex
CREATE INDEX "ProductBatch_companyId_productId_isActive_idx" ON "ProductBatch"("companyId", "productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBatch_id_companyId_key" ON "ProductBatch"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBatch_id_productId_companyId_key" ON "ProductBatch"("id", "productId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerGroup_companyId_name_key" ON "CustomerGroup"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerGroup_id_companyId_key" ON "CustomerGroup"("id", "companyId");

-- CreateIndex
CREATE INDEX "Customer_companyId_phone_idx" ON "Customer"("companyId", "phone");

-- CreateIndex
CREATE INDEX "Customer_companyId_name_idx" ON "Customer"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_code_key" ON "Customer"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_id_companyId_key" ON "Customer"("id", "companyId");

-- CreateIndex
CREATE INDEX "Supplier_companyId_phone_idx" ON "Supplier"("companyId", "phone");

-- CreateIndex
CREATE INDEX "Supplier_companyId_name_idx" ON "Supplier"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_companyId_code_key" ON "Supplier"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_id_companyId_key" ON "Supplier"("id", "companyId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_supplierId_orderDate_idx" ON "PurchaseOrder"("companyId", "supplierId", "orderDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_branchId_status_idx" ON "PurchaseOrder"("companyId", "branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_companyId_orderNumber_key" ON "PurchaseOrder"("companyId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_id_companyId_key" ON "PurchaseOrder"("id", "companyId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_companyId_orderId_idx" ON "PurchaseOrderItem"("companyId", "orderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_companyId_productId_idx" ON "PurchaseOrderItem"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderItem_id_companyId_key" ON "PurchaseOrderItem"("id", "companyId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_companyId_warehouseId_receivedAt_idx" ON "GoodsReceipt"("companyId", "warehouseId", "receivedAt");

-- CreateIndex
CREATE INDEX "GoodsReceipt_companyId_orderId_idx" ON "GoodsReceipt"("companyId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_companyId_receiptNumber_key" ON "GoodsReceipt"("companyId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_id_companyId_key" ON "GoodsReceipt"("id", "companyId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_companyId_receiptId_idx" ON "GoodsReceiptItem"("companyId", "receiptId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_companyId_productId_batchId_idx" ON "GoodsReceiptItem"("companyId", "productId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptItem_id_companyId_key" ON "GoodsReceiptItem"("id", "companyId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_companyId_supplierId_invoiceDate_idx" ON "PurchaseInvoice"("companyId", "supplierId", "invoiceDate");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_companyId_status_dueDate_idx" ON "PurchaseInvoice"("companyId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_companyId_invoiceNumber_key" ON "PurchaseInvoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_id_companyId_key" ON "PurchaseInvoice"("id", "companyId");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_companyId_invoiceId_idx" ON "PurchaseInvoiceItem"("companyId", "invoiceId");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_companyId_productId_idx" ON "PurchaseInvoiceItem"("companyId", "productId");

-- CreateIndex
CREATE INDEX "Sale_companyId_branchId_saleDate_idx" ON "Sale"("companyId", "branchId", "saleDate");

-- CreateIndex
CREATE INDEX "Sale_companyId_customerId_saleDate_idx" ON "Sale"("companyId", "customerId", "saleDate");

-- CreateIndex
CREATE INDEX "Sale_companyId_status_idx" ON "Sale"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_companyId_invoiceNumber_key" ON "Sale"("companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_id_companyId_key" ON "Sale"("id", "companyId");

-- CreateIndex
CREATE INDEX "SaleItem_companyId_saleId_idx" ON "SaleItem"("companyId", "saleId");

-- CreateIndex
CREATE INDEX "SaleItem_companyId_productId_batchId_idx" ON "SaleItem"("companyId", "productId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_id_companyId_key" ON "SaleItem"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_companyId_code_key" ON "PaymentMethod"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_id_companyId_key" ON "PaymentMethod"("id", "companyId");

-- CreateIndex
CREATE INDEX "Payment_companyId_branchId_paidAt_idx" ON "Payment"("companyId", "branchId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_companyId_customerId_paidAt_idx" ON "Payment"("companyId", "customerId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_companyId_supplierId_paidAt_idx" ON "Payment"("companyId", "supplierId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_companyId_paymentNumber_key" ON "Payment"("companyId", "paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_id_companyId_key" ON "Payment"("id", "companyId");

-- CreateIndex
CREATE INDEX "SalePayment_companyId_paymentId_idx" ON "SalePayment"("companyId", "paymentId");

-- CreateIndex
CREATE INDEX "PurchasePayment_companyId_paymentId_idx" ON "PurchasePayment"("companyId", "paymentId");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_warehouseId_productId_occurredA_idx" ON "InventoryMovement"("companyId", "warehouseId", "productId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_productId_batchId_occurredAt_idx" ON "InventoryMovement"("companyId", "productId", "batchId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_referenceType_referenceId_idx" ON "InventoryMovement"("companyId", "referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "InventoryMovement_correlationId_idx" ON "InventoryMovement"("correlationId");

-- CreateIndex
CREATE INDEX "InventoryBalance_companyId_branchId_productId_idx" ON "InventoryBalance"("companyId", "branchId", "productId");

-- CreateIndex
CREATE INDEX "InventoryBalance_companyId_productId_baseQuantity_idx" ON "InventoryBalance"("companyId", "productId", "baseQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_companyId_warehouseId_productId_batchId_key" ON "InventoryBalance"("companyId", "warehouseId", "productId", "batchId");

-- CreateIndex
CREATE INDEX "CashShift_companyId_registerId_status_idx" ON "CashShift"("companyId", "registerId", "status");

-- CreateIndex
CREATE INDEX "CashShift_companyId_cashierId_openedAt_idx" ON "CashShift"("companyId", "cashierId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashShift_id_companyId_key" ON "CashShift"("id", "companyId");

-- CreateIndex
CREATE INDEX "CashMovement_companyId_shiftId_occurredAt_idx" ON "CashMovement"("companyId", "shiftId", "occurredAt");

-- CreateIndex
CREATE INDEX "CashMovement_companyId_referenceType_referenceId_idx" ON "CashMovement"("companyId", "referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_companyId_name_key" ON "ExpenseCategory"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_id_companyId_key" ON "ExpenseCategory"("id", "companyId");

-- CreateIndex
CREATE INDEX "Expense_companyId_branchId_expenseDate_idx" ON "Expense"("companyId", "branchId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_companyId_categoryId_expenseDate_idx" ON "Expense"("companyId", "categoryId", "expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_companyId_expenseNumber_key" ON "Expense"("companyId", "expenseNumber");

-- CreateIndex
CREATE INDEX "Setting_companyId_scope_key_idx" ON "Setting"("companyId", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_companyId_branchId_key_key" ON "Setting"("companyId", "branchId", "key");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_entityType_entityId_createdAt_idx" ON "AuditLog"("companyId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_actorId_createdAt_idx" ON "AuditLog"("companyId", "actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_action_createdAt_idx" ON "AuditLog"("companyId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Register" ADD CONSTRAINT "Register_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_companyId_fkey" FOREIGN KEY ("roleId", "companyId") REFERENCES "Role"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_companyId_fkey" FOREIGN KEY ("userId", "companyId") REFERENCES "User"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_companyId_fkey" FOREIGN KEY ("roleId", "companyId") REFERENCES "Role"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_userId_companyId_fkey" FOREIGN KEY ("userId", "companyId") REFERENCES "User"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_companyId_fkey" FOREIGN KEY ("parentId", "companyId") REFERENCES "Category"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_companyId_fkey" FOREIGN KEY ("categoryId", "companyId") REFERENCES "Category"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_companyId_fkey" FOREIGN KEY ("brandId", "companyId") REFERENCES "Brand"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_baseUnitId_companyId_fkey" FOREIGN KEY ("baseUnitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTileProfile" ADD CONSTRAINT "ProductTileProfile_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitConversion" ADD CONSTRAINT "UnitConversion_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitConversion" ADD CONSTRAINT "UnitConversion_fromUnitId_companyId_fkey" FOREIGN KEY ("fromUnitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_supplierId_companyId_fkey" FOREIGN KEY ("supplierId", "companyId") REFERENCES "Supplier"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerGroup" ADD CONSTRAINT "CustomerGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_groupId_companyId_fkey" FOREIGN KEY ("groupId", "companyId") REFERENCES "CustomerGroup"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_companyId_fkey" FOREIGN KEY ("supplierId", "companyId") REFERENCES "Supplier"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_orderId_companyId_fkey" FOREIGN KEY ("orderId", "companyId") REFERENCES "PurchaseOrder"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_orderId_companyId_fkey" FOREIGN KEY ("orderId", "companyId") REFERENCES "PurchaseOrder"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_receivedById_companyId_fkey" FOREIGN KEY ("receivedById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_receiptId_companyId_fkey" FOREIGN KEY ("receiptId", "companyId") REFERENCES "GoodsReceipt"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_orderItemId_companyId_fkey" FOREIGN KEY ("orderItemId", "companyId") REFERENCES "PurchaseOrderItem"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_batchId_productId_companyId_fkey" FOREIGN KEY ("batchId", "productId", "companyId") REFERENCES "ProductBatch"("id", "productId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_companyId_fkey" FOREIGN KEY ("supplierId", "companyId") REFERENCES "Supplier"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_receiptId_companyId_fkey" FOREIGN KEY ("receiptId", "companyId") REFERENCES "GoodsReceipt"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_companyId_fkey" FOREIGN KEY ("invoiceId", "companyId") REFERENCES "PurchaseInvoice"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_receiptItemId_companyId_fkey" FOREIGN KEY ("receiptItemId", "companyId") REFERENCES "GoodsReceiptItem"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_registerId_branchId_companyId_fkey" FOREIGN KEY ("registerId", "branchId", "companyId") REFERENCES "Register"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_companyId_fkey" FOREIGN KEY ("customerId", "companyId") REFERENCES "Customer"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_companyId_fkey" FOREIGN KEY ("saleId", "companyId") REFERENCES "Sale"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_batchId_productId_companyId_fkey" FOREIGN KEY ("batchId", "productId", "companyId") REFERENCES "ProductBatch"("id", "productId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_methodId_companyId_fkey" FOREIGN KEY ("methodId", "companyId") REFERENCES "PaymentMethod"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_companyId_fkey" FOREIGN KEY ("customerId", "companyId") REFERENCES "Customer"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_supplierId_companyId_fkey" FOREIGN KEY ("supplierId", "companyId") REFERENCES "Supplier"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_companyId_fkey" FOREIGN KEY ("recordedById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_companyId_fkey" FOREIGN KEY ("saleId", "companyId") REFERENCES "Sale"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_paymentId_companyId_fkey" FOREIGN KEY ("paymentId", "companyId") REFERENCES "Payment"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_invoiceId_companyId_fkey" FOREIGN KEY ("invoiceId", "companyId") REFERENCES "PurchaseInvoice"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_paymentId_companyId_fkey" FOREIGN KEY ("paymentId", "companyId") REFERENCES "Payment"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_batchId_productId_companyId_fkey" FOREIGN KEY ("batchId", "productId", "companyId") REFERENCES "ProductBatch"("id", "productId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_batchId_productId_companyId_fkey" FOREIGN KEY ("batchId", "productId", "companyId") REFERENCES "ProductBatch"("id", "productId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_registerId_branchId_companyId_fkey" FOREIGN KEY ("registerId", "branchId", "companyId") REFERENCES "Register"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_cashierId_companyId_fkey" FOREIGN KEY ("cashierId", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_shiftId_companyId_fkey" FOREIGN KEY ("shiftId", "companyId") REFERENCES "CashShift"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_paymentId_companyId_fkey" FOREIGN KEY ("paymentId", "companyId") REFERENCES "Payment"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_recordedById_companyId_fkey" FOREIGN KEY ("recordedById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_companyId_fkey" FOREIGN KEY ("categoryId", "companyId") REFERENCES "ExpenseCategory"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethodId_companyId_fkey" FOREIGN KEY ("paymentMethodId", "companyId") REFERENCES "PaymentMethod"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_companyId_fkey" FOREIGN KEY ("actorId", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business invariants not expressible in the Prisma schema.
ALTER TABLE "Company" ADD CONSTRAINT "Company_scale_check" CHECK ("quantityScale" BETWEEN 0 AND 10 AND "moneyScale" BETWEEN 0 AND 6);
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_decimalScale_check" CHECK ("decimalScale" BETWEEN 0 AND 10);
ALTER TABLE "Product" ADD CONSTRAINT "Product_nonnegative_values_check" CHECK (("standardCost" IS NULL OR "standardCost" >= 0) AND ("reorderLevel" IS NULL OR "reorderLevel" >= 0));
ALTER TABLE "ProductTileProfile" ADD CONSTRAINT "ProductTileProfile_dimensions_check" CHECK ("widthMm" > 0 AND "heightMm" > 0 AND ("thicknessMm" IS NULL OR "thicknessMm" > 0));
ALTER TABLE "UnitConversion" ADD CONSTRAINT "UnitConversion_factor_check" CHECK ("factorToBase" > 0 AND "version" > 0);
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_credit_check" CHECK ("creditLimit" >= 0);
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_totals_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "freight" >= 0 AND "total" >= 0);
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_values_check" CHECK ("quantity" > 0 AND "baseQuantity" > 0 AND "conversionFactor" > 0 AND "unitCost" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "lineTotal" >= 0);
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_values_check" CHECK ("quantity" > 0 AND "baseQuantity" > 0 AND "conversionFactor" > 0 AND "unitCost" >= 0);
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_totals_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "freight" >= 0 AND "additionalCost" >= 0 AND "total" >= 0);
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_values_check" CHECK ("quantity" > 0 AND "baseQuantity" > 0 AND "unitCost" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "lineTotal" >= 0);
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_totals_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "total" >= 0 AND "paid" >= 0 AND "due" >= 0 AND "change" >= 0);
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_values_check" CHECK ("quantity" > 0 AND "baseQuantity" > 0 AND "conversionFactor" > 0 AND "unitPrice" >= 0 AND "unitCost" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "lineTotal" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_party_check" CHECK ("amount" > 0 AND NOT ("customerId" IS NOT NULL AND "supplierId" IS NOT NULL));
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_amount_check" CHECK ("amount" > 0);
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_amount_check" CHECK ("amount" > 0);
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_values_check" CHECK (
  "transactionQuantity" > 0 AND "conversionFactor" > 0 AND "baseQuantity" <> 0 AND ("unitCost" IS NULL OR "unitCost" >= 0)
  AND CASE
    WHEN "type" IN ('OPENING', 'PURCHASE_RECEIPT', 'SALE_RETURN', 'TRANSFER_IN') THEN "baseQuantity" > 0
    WHEN "type" IN ('SALE', 'PURCHASE_RETURN', 'DAMAGE', 'LOSS', 'TRANSFER_OUT') THEN "baseQuantity" < 0
    ELSE TRUE
  END
);
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_version_check" CHECK ("version" >= 0);
ALTER TABLE "CashShift" ADD CONSTRAINT "CashShift_values_check" CHECK (
  "openingCash" >= 0
  AND (("status" = 'OPEN' AND "closedAt" IS NULL) OR ("status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "expectedCash" IS NOT NULL AND "actualCash" IS NOT NULL AND "variance" IS NOT NULL))
);
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_amount_check" CHECK ("amount" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_check" CHECK ("amount" > 0);
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_scope_check" CHECK (("scope" = 'COMPANY' AND "branchId" IS NULL) OR ("scope" = 'BRANCH' AND "branchId" IS NOT NULL));

-- PostgreSQL null-safe and partial uniqueness required by operational invariants.
DROP INDEX "InventoryBalance_companyId_warehouseId_productId_batchId_key";
CREATE UNIQUE INDEX "InventoryBalance_location_product_batch_key" ON "InventoryBalance" ("companyId", "warehouseId", "productId", "batchId") NULLS NOT DISTINCT;

DROP INDEX "Setting_companyId_branchId_key_key";
CREATE UNIQUE INDEX "Setting_scope_key" ON "Setting" ("companyId", "branchId", "key") NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "ProductBatch_identity_key" ON "ProductBatch" ("companyId", "productId", "batchNumber", "lotNumber", "shade") NULLS NOT DISTINCT;
CREATE UNIQUE INDEX "CashShift_one_open_per_register_key" ON "CashShift" ("companyId", "registerId") WHERE "status" = 'OPEN';
CREATE UNIQUE INDEX "Customer_one_walk_in_key" ON "Customer" ("companyId") WHERE "isWalkIn" = true;
CREATE UNIQUE INDEX "ProductBarcode_one_primary_key" ON "ProductBarcode" ("companyId", "productId") WHERE "isPrimary" = true;

-- Inventory history is corrected by compensating movements, never update/delete.
CREATE FUNCTION prevent_inventory_movement_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Inventory movements are immutable; create a compensating movement';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryMovement_immutable_update"
BEFORE UPDATE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

CREATE TRIGGER "InventoryMovement_immutable_delete"
BEFORE DELETE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();
