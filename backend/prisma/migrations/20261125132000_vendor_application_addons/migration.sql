ALTER TABLE "vendor_applications"
ADD COLUMN "tables_and_chairs_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "extension_cord_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
