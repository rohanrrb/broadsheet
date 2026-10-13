-- broadsheet rule: writing dates are set by the software and never change.
-- Enforced here too so no code path (or manual SQL) can slip past the service layer.
CREATE TRIGGER `writings_created_at_immutable`
BEFORE UPDATE OF `created_at` ON `writings`
WHEN NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
  SELECT RAISE(ABORT, 'writings.created_at is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `writing_edits_immutable`
BEFORE UPDATE ON `writing_edits`
BEGIN
  SELECT RAISE(ABORT, 'writing_edits rows are immutable');
END;
