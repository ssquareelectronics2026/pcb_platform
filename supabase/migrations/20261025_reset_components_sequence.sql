-- ==============================================================================
-- Migration: Intelligent Sequence Reset & Gap Handling for components table
-- Description: Ensures Postgres ID sequence automatically resets or syncs with
--              MAX(id) upon row deletion, preventing gap inflation (e.g. jumping to 8).
-- ==============================================================================

-- 1. Function to dynamically reset components sequence to MAX(id)
CREATE OR REPLACE FUNCTION reset_components_sequence()
RETURNS jsonb AS $$
DECLARE
  seq_name text;
  max_val bigint;
  target_next bigint;
BEGIN
  -- A. Dynamically locate the sequence associated with components.id
  SELECT pg_get_serial_sequence('components', 'id') INTO seq_name;
  
  -- Fallback to standard sequence name if pg_get_serial_sequence returns NULL
  IF seq_name IS NULL THEN
    seq_name := 'components_id_seq';
  END IF;

  -- B. Determine the current maximum ID in the components table
  SELECT COALESCE(MAX(id), 0) INTO max_val FROM components;

  -- C. Reset the sequence:
  -- If table is empty (max_val = 0), set sequence to 1 with is_called = false
  -- If table has rows, set sequence to max_val with is_called = true (nextval will yield max_val + 1)
  IF max_val = 0 THEN
    EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
    target_next := 1;
  ELSE
    EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_val);
    target_next := max_val + 1;
  END IF;

  RETURN json_build_object(
    'success', true,
    'sequence', seq_name,
    'max_id', max_val,
    'next_value', target_next
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to set sequence to a custom target value (e.g. desired starting ID)
CREATE OR REPLACE FUNCTION set_table_sequence(seq_table text, target_val bigint)
RETURNS jsonb AS $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence(seq_table, 'id') INTO seq_name;
  IF seq_name IS NULL THEN
    seq_name := seq_table || '_id_seq';
  END IF;

  IF target_val <= 0 THEN
    EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
  ELSE
    EXECUTE format('SELECT setval(%L, %s, true)', seq_name, target_val);
  END IF;

  RETURN json_build_object(
    'success', true,
    'sequence', seq_name,
    'set_value', target_val
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to compute the lowest available gap ID in the components table
CREATE OR REPLACE FUNCTION get_next_available_component_id()
RETURNS bigint AS $$
DECLARE
  gap_id bigint;
BEGIN
  -- Check if ID 1 is free
  IF NOT EXISTS (SELECT 1 FROM components WHERE id = 1) THEN
    RETURN 1;
  END IF;

  -- Find the lowest positive integer gap (where id + 1 does not exist)
  SELECT (c1.id + 1) INTO gap_id
  FROM components c1
  WHERE NOT EXISTS (
    SELECT 1 FROM components c2 WHERE c2.id = c1.id + 1
  ) AND c1.id > 0
  ORDER BY c1.id ASC
  LIMIT 1;

  RETURN COALESCE(gap_id, 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Trigger to automatically reset sequence upon ANY deletion from components
CREATE OR REPLACE FUNCTION trg_auto_reset_components_sequence()
RETURNS trigger AS $$
BEGIN
  PERFORM reset_components_sequence();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reset_components_sequence_on_delete ON components;
CREATE TRIGGER trigger_reset_components_sequence_on_delete
AFTER DELETE ON components
FOR EACH STATEMENT
EXECUTE FUNCTION trg_auto_reset_components_sequence();

-- 5. Helper Query for One-Time Manual Execution in Supabase SQL Editor:
-- SELECT reset_components_sequence();
