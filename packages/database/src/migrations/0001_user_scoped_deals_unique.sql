ALTER TABLE deals
DROP CONSTRAINT IF EXISTS deals_source_item_unique;

ALTER TABLE deals
ADD CONSTRAINT deals_user_source_item_unique UNIQUE (user_id, source, source_id);
