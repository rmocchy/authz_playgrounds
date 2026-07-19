-- Create separate databases for Auth and Memo services.
-- Runs once on first Postgres container init (docker-entrypoint-initdb.d).
CREATE DATABASE auth;
CREATE DATABASE memo;
