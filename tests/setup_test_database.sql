-- Test Database Setup Script
-- Creates a separate test database for running PHPUnit tests

-- Create test database
DROP DATABASE IF EXISTS accountech_test;
CREATE DATABASE accountech_test;

-- Connect to test database
\c accountech_test

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Import schema from production database
-- Note: This should be run separately to import the full schema
-- pg_dump -h 127.0.0.1 -U accountech_app -d accountech_production --schema-only | psql -h 127.0.0.1 -U accountech_app -d accountech_test

-- Create test user if needed (usually same as production for simplicity)
-- GRANT ALL PRIVILEGES ON DATABASE accountech_test TO accountech_app;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO accountech_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO accountech_app;

-- Add test-specific configurations
-- (None needed for now)
