CREATE TABLE "vendor_documents" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "storage_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_documents_storage_name_key" ON "vendor_documents"("storage_name");
CREATE INDEX "vendor_documents_vendor_id_idx" ON "vendor_documents"("vendor_id");

ALTER TABLE "vendor_documents"
ADD CONSTRAINT "vendor_documents_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;