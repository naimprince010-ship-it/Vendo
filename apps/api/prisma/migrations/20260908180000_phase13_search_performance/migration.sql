-- PostgreSQL substring search support for the bounded catalog and party APIs.
-- Tenant predicates remain enforced by every application query; these GIN indexes
-- accelerate the user-entered ILIKE '%term%' portion without changing semantics.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Category_name_trgm_idx" ON "Category" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Brand_name_trgm_idx" ON "Brand" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Manufacturer_name_trgm_idx" ON "Manufacturer" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_sku_trgm_idx" ON "Product" USING GIN ("sku" gin_trgm_ops);
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_model_trgm_idx" ON "Product" USING GIN ("model" gin_trgm_ops);
CREATE INDEX "ProductTileProfile_displaySize_trgm_idx" ON "ProductTileProfile" USING GIN ("displaySize" gin_trgm_ops);
CREATE INDEX "ProductBarcode_barcode_trgm_idx" ON "ProductBarcode" USING GIN ("barcode" gin_trgm_ops);
CREATE INDEX "CustomerGroup_name_trgm_idx" ON "CustomerGroup" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Customer_code_trgm_idx" ON "Customer" USING GIN ("code" gin_trgm_ops);
CREATE INDEX "Customer_name_trgm_idx" ON "Customer" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Customer_phone_trgm_idx" ON "Customer" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX "Customer_email_trgm_idx" ON "Customer" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "Supplier_code_trgm_idx" ON "Supplier" USING GIN ("code" gin_trgm_ops);
CREATE INDEX "Supplier_name_trgm_idx" ON "Supplier" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Supplier_contactName_trgm_idx" ON "Supplier" USING GIN ("contactName" gin_trgm_ops);
CREATE INDEX "Supplier_phone_trgm_idx" ON "Supplier" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX "Supplier_email_trgm_idx" ON "Supplier" USING GIN ("email" gin_trgm_ops);
