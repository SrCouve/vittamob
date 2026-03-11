-- ══════════════════════════════════════════════
-- VITTA UP — Supabase Database Schema (MVP)
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════

-- ══ PROFILES ══
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  avatar_url text,
  bio text,
  interests text[] default '{}',
  points_balance int default 0,
  streak_days int default 0,
  streak_last_date date,
  total_lessons int default 0,
  total_hours numeric(10,2) default 0,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'plus', 'pro')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ══ MODULES ══
create table public.modules (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  thumbnail_url text,
  lesson_count int default 0,
  "order" int default 0,
  is_free boolean default false,
  created_at timestamptz default now()
);

alter table public.modules enable row level security;
create policy "Anyone can read modules" on public.modules for select using (true);

-- ══ LESSONS ══
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references public.modules on delete cascade not null,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  duration_seconds int default 0,
  "order" int default 0,
  is_free boolean default false,
  created_at timestamptz default now()
);

alter table public.lessons enable row level security;
create policy "Anyone can read lessons" on public.lessons for select using (true);

-- ══ USER LESSON PROGRESS ══
create table public.user_lesson_progress (
  user_id uuid references auth.users on delete cascade,
  lesson_id uuid references public.lessons on delete cascade,
  watch_seconds int default 0,
  completed boolean default false,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  primary key (user_id, lesson_id)
);

alter table public.user_lesson_progress enable row level security;
create policy "Users can read own progress" on public.user_lesson_progress for select using (auth.uid() = user_id);
create policy "Users can upsert own progress" on public.user_lesson_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on public.user_lesson_progress for update using (auth.uid() = user_id);

-- ══ POINTS LEDGER ══
create table public.points_ledger (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount int not null,
  type text not null,
  description text,
  created_at timestamptz default now()
);

alter table public.points_ledger enable row level security;
create policy "Users can read own points" on public.points_ledger for select using (auth.uid() = user_id);
create policy "Users can insert own points" on public.points_ledger for insert with check (auth.uid() = user_id);

-- ══ FUNCTION: Increment Points ══
create or replace function public.increment_points(user_id_input uuid, amount_input int)
returns void as $$
begin
  update public.profiles
  set points_balance = points_balance + amount_input
  where id = user_id_input;
end;
$$ language plpgsql security definer;

-- ══ FUNCTION: Update Streak ══
create or replace function public.update_streak(user_id_input uuid)
returns void as $$
declare
  last_date date;
  current_streak int;
begin
  select streak_last_date, streak_days into last_date, current_streak
  from public.profiles where id = user_id_input;

  if last_date = current_date then
    -- Already counted today
    return;
  elsif last_date = current_date - 1 then
    -- Consecutive day
    update public.profiles
    set streak_days = current_streak + 1, streak_last_date = current_date
    where id = user_id_input;
  else
    -- Streak broken, restart
    update public.profiles
    set streak_days = 1, streak_last_date = current_date
    where id = user_id_input;
  end if;
end;
$$ language plpgsql security definer;

-- ══ TRIGGER: Auto-create profile on signup ══
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Usuário'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
