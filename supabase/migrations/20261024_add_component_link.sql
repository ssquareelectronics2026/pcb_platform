-- Migration: Add component_link to component_requests table
ALTER TABLE component_requests 
ADD COLUMN IF NOT EXISTS component_link TEXT;
