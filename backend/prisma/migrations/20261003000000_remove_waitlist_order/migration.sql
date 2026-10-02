-- Cancellation vacancies are now first-come, first-served rather than queued.
UPDATE "reservations"
SET "waitlist_order" = NULL
WHERE "status" = 'waitlisted';
