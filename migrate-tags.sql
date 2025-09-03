-- Migration Script: Allow duplicate tag names in different categories
-- Date: 2025-09-04
-- Purpose: Change UNIQUE constraint from 'name' to 'name + category_id'

BEGIN TRANSACTION;

-- Step 1: Create new tags table with correct structure
CREATE TABLE tags_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#9ca3af',
    icon TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE
);

-- Step 2: Create indexes for the new table
CREATE INDEX idx_tags_new_order ON tags_new(order_index);
CREATE INDEX idx_tags_new_category ON tags_new(category_id);
CREATE UNIQUE INDEX idx_tags_new_unique_per_category ON tags_new(name, category_id);

-- Step 3: Copy all existing data to new table
INSERT INTO tags_new (id, name, color, icon, order_index, created_at, updated_at, category_id)
SELECT id, name, color, icon, order_index, created_at, updated_at, category_id 
FROM tags;

-- Step 4: Create trigger for updated_at
CREATE TRIGGER update_tags_new_timestamp 
AFTER UPDATE ON tags_new
BEGIN
    UPDATE tags_new SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Step 5: Drop old table and rename new one
DROP TABLE tags;
ALTER TABLE tags_new RENAME TO tags;

-- Step 6: Recreate trigger with correct name
DROP TRIGGER update_tags_new_timestamp;
CREATE TRIGGER update_tags_timestamp 
AFTER UPDATE ON tags
BEGIN
    UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

COMMIT;