/*
  # Create Missing Persons Table

  1. New Tables
    - `missing_persons`
      - `id` (uuid, primary key)
      - `name` (text)
      - `age` (integer)
      - `last_location` (text)
      - `contact_number` (text)
      - `status` (text)
      - `timestamp` (timestamptz)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `missing_persons` table
    - Add policies for:
      - Anyone can read all records
      - Authenticated users can create records
      - Users can only update their own records
*/

CREATE TABLE IF NOT EXISTS missing_persons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    age integer NOT NULL,
    last_location text NOT NULL,
    contact_number text NOT NULL,
    status text NOT NULL DEFAULT 'missing',
    timestamp timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE missing_persons ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all records
CREATE POLICY "Anyone can read missing persons"
    ON missing_persons
    FOR SELECT
    TO public
    USING (true);

-- Allow authenticated users to create records
CREATE POLICY "Authenticated users can create records"
    ON missing_persons
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own records
CREATE POLICY "Users can update own records"
    ON missing_persons
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);