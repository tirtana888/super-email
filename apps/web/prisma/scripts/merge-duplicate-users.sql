-- Merge User rows whose emails differ only by letter case or surrounding whitespace.
--
-- How to use (run against the production database, ideally after a backup):
--   1. Run STEP 1 on its own and review the output.
--   2. If it looks right, run STEP 2 (it is one transaction; nothing changes if it errors).
--
-- Keeper rule: prefer an approved row (isWaitlisted = false), then the oldest id.
-- Account, Session, TeamUser and Webhook.createdByUserId are re-pointed to the keeper,
-- the duplicates are deleted, and every remaining email is lowercased and trimmed.

-- STEP 1: preview (read-only)
SELECT lower(trim(email)) AS normalized_email,
       array_agg(id ORDER BY "isWaitlisted" ASC, id ASC) AS user_ids,
       array_agg(email ORDER BY "isWaitlisted" ASC, id ASC) AS stored_emails,
       array_agg("isWaitlisted" ORDER BY "isWaitlisted" ASC, id ASC) AS waitlisted
FROM "User"
WHERE email IS NOT NULL
GROUP BY lower(trim(email))
HAVING count(*) > 1;

-- STEP 2: merge
BEGIN;

CREATE TEMP TABLE user_merge ON COMMIT DROP AS
SELECT u.id AS dup_id, k.keep_id
FROM "User" u
JOIN (
  SELECT lower(trim(email)) AS normalized_email,
         (array_agg(id ORDER BY "isWaitlisted" ASC, id ASC))[1] AS keep_id
  FROM "User"
  WHERE email IS NOT NULL
  GROUP BY lower(trim(email))
  HAVING count(*) > 1
) k ON lower(trim(u.email)) = k.normalized_email
WHERE u.id <> k.keep_id;

UPDATE "Account" a SET "userId" = m.keep_id
FROM user_merge m WHERE a."userId" = m.dup_id;

UPDATE "Session" s SET "userId" = m.keep_id
FROM user_merge m WHERE s."userId" = m.dup_id;

-- A user can only be in a team once: drop the duplicate's membership if the keeper already has it.
DELETE FROM "TeamUser" t
USING user_merge m
WHERE t."userId" = m.dup_id
  AND EXISTS (
    SELECT 1 FROM "TeamUser" k
    WHERE k."userId" = m.keep_id AND k."teamId" = t."teamId"
  );

UPDATE "TeamUser" t SET "userId" = m.keep_id
FROM user_merge m WHERE t."userId" = m.dup_id;

UPDATE "Webhook" w SET "createdByUserId" = m.keep_id
FROM user_merge m WHERE w."createdByUserId" = m.dup_id;

DELETE FROM "User" u USING user_merge m WHERE u.id = m.dup_id;

UPDATE "User" SET email = lower(trim(email))
WHERE email IS NOT NULL AND email <> lower(trim(email));

COMMIT;
