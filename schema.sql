CREATE TABLE classes (
  id serial PRIMARY KEY, 
  name text NOT NULL,
  prize_money integer NOT NULL DEFAULT 0
);

CREATE TABLE entries (
  id serial PRIMARY KEY,
  horse_id integer NOT NULL, 
  horse_name text NOT NULL,
  rider_name text NOT NULL,
  class_id integer REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE accounts (
  email text PRIMARY KEY, 
  password text NOT NULL
);
