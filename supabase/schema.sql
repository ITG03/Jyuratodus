-- Supabase schema for Weighbridge app

create table if not exists people (
  id bigserial primary key,
  name text not null unique,
  "group" text not null default '',
  shift text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists groups (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists shifts (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists weighbridge_records (
  id bigserial primary key,
  w_datetime timestamptz,
  site text,
  user_full_name text,
  person_name text,
  amount_due numeric,
  gvm_fine numeric,
  d1_fine numeric,
  d2_fine numeric,
  d3_fine numeric,
  d4_fine numeric,
  awkward_load_fine numeric,
  amount_due_driver numeric,
  total_revenue numeric,
  created_at timestamptz not null default now()
);

-- Updated timestamp trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_people_updated on people;
create trigger trg_people_updated before update on people
for each row execute procedure set_updated_at();

-- Enable RLS
alter table people enable row level security;
alter table groups enable row level security;
alter table shifts enable row level security;
alter table weighbridge_records enable row level security;

-- Dev policy: public read/write (adjust for production)
create policy if not exists anon_all_people on people for all using (true) with check (true);
create policy if not exists anon_all_groups on groups for all using (true) with check (true);
create policy if not exists anon_all_shifts on shifts for all using (true) with check (true);
create policy if not exists anon_all_wb on weighbridge_records for all using (true) with check (true);