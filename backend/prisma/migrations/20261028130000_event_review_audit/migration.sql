ALTER TABLE "audit_logs"
ADD COLUMN "affected_event_id" TEXT;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_affected_event_id_fkey"
FOREIGN KEY ("affected_event_id") REFERENCES "events"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
