-- Enable the uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Priority level enum
CREATE TYPE priority_level AS ENUM ('LOW', 'MED', 'HIGH');

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    task_id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               TEXT            NOT NULL,
    description         TEXT            NOT NULL DEFAULT '',
    due_date            TIMESTAMPTZ     NOT NULL,
    task_duration       INTEGER         NOT NULL CHECK (task_duration > 0),
    priority            priority_level  NOT NULL DEFAULT 'MED',
    is_complete         BOOLEAN         NOT NULL DEFAULT FALSE,
    calendar_event_id   TEXT            NULL,
    scheduled_start     TIMESTAMPTZ     NULL,
    source_note_id      UUID            NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Index to quickly fetch all tasks originating from a given sticky note
CREATE INDEX IF NOT EXISTS idx_tasks_source_note_id ON tasks (source_note_id);

-- Index to quickly find tasks that have not yet been scheduled
CREATE INDEX IF NOT EXISTS idx_tasks_unscheduled
    ON tasks (is_complete, scheduled_start)
    WHERE is_complete = FALSE AND scheduled_start IS NULL;
