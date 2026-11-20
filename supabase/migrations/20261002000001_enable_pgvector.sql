-- Phase A4: enable pgvector for the evidence retrieval layer.
-- Run in the Supabase SQL editor as the project owner. Safe to re-run.
create extension if not exists vector;
