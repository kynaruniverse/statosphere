-- ============================================================
-- FULL STATOSPHERE SCHEMA — PRODUCTION READY
-- Run in Supabase SQL editor
-- ============================================================

-- ---- EXTENSIONS ----
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- profiles (auto-created on auth.user insert via trigger)
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text unique,
  full_name             text,
  becoming_statement    text,
  avatar_url            text,
  bio                   text,
  location              text,
  onboarding_complete   boolean not null default false,
  profile_public        boolean not null default true,
  council_requests_open boolean not null default true,
  email_notifications   boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint username_format check (
    username ~ '^[a-zA-Z0-9_]{3,20}$'
  )
);

-- stat_categories (seeded, not user-created)
create table if not exists public.stat_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  icon        text not null,
  description text not null,
  created_at  timestamptz not null default now()
);

-- user_stats
create table if not exists public.user_stats (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  stat_category_id  uuid not null references public.stat_categories(id) on delete cascade,
  current_value     integer not null default 0 check (current_value >= 0),
  created_at        timestamptz not null default now(),
  unique(user_id, stat_category_id)
);

-- streaks
create table if not exists public.streaks (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  stat_category_id      uuid not null references public.stat_categories(id) on delete cascade,
  current_streak        integer not null default 0,
  longest_streak        integer not null default 0,
  last_completed_cycle  text,
  updated_at            timestamptz not null default now(),
  unique(user_id, stat_category_id)
);

-- councils
create table if not exists public.councils (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'My Council',
  created_at  timestamptz not null default now(),
  unique(owner_id)  -- one council per user
);

-- council_members
create table if not exists public.council_members (
  id            uuid primary key default gen_random_uuid(),
  council_id    uuid not null references public.councils(id) on delete cascade,
  member_id     uuid references public.profiles(id) on delete set null,
  invite_email  text,
  invite_token  text unique,
  status        text not null default 'pending'
    check (status in ('pending', 'active', 'removed')),
  invited_at    timestamptz not null default now(),
  joined_at     timestamptz
);

-- council_requests
create table if not exists public.council_requests (
  id              uuid primary key default gen_random_uuid(),
  requester_id    uuid not null references public.profiles(id) on delete cascade,
  target_user_id  uuid not null references public.profiles(id) on delete cascade,
  message         text,
  status          text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz not null default now(),
  unique(requester_id, target_user_id)  -- prevent duplicate requests
);

-- tasks
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  council_id        uuid not null references public.councils(id) on delete cascade,
  assigned_to       uuid not null references public.profiles(id) on delete cascade,
  assigned_by       uuid not null references public.profiles(id) on delete cascade,
  stat_category_id  uuid not null references public.stat_categories(id),
  title             text not null,
  description       text,
  due_date          timestamptz,
  cycle_week        text,  -- e.g. "2026-W17"
  status            text not null default 'active'
    check (status in ('active', 'completed', 'expired')),
  created_at        timestamptz not null default now()
);

-- submissions
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  note          text,
  media_url     text,
  status        text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'needs_more')),
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz
);

-- feedback
create table if not exists public.feedback (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  reviewer_id    uuid not null references public.profiles(id) on delete cascade,
  type           text not null default 'review'
    check (type in ('review', 'comment')),
  decision       text check (decision in ('approved', 'rejected', 'needs_more')),
  comment        text,
  created_at     timestamptz not null default now()
);

-- activity_log
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  meta        jsonb default '{}',
  created_at  timestamptz not null default now()
);

-- pending_stat_changes (holds gains until cycle end)
create table if not exists public.pending_stat_changes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  stat_category_id  uuid not null references public.stat_categories(id),
  delta             integer not null default 5,
  source            text not null default 'task',
  source_id         uuid not null,  -- submission_id
  applied           boolean not null default false,
  created_at        timestamptz not null default now(),
  unique(source_id)  -- prevent double-applying for same submission
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_user_stats_user_id on public.user_stats(user_id);
create index if not exists idx_streaks_user_id on public.streaks(user_id);
create index if not exists idx_council_members_council_id on public.council_members(council_id);
create index if not exists idx_council_members_member_id on public.council_members(member_id);
create index if not exists idx_council_members_token on public.council_members(invite_token) where invite_token is not null;
create index if not exists idx_council_requests_target on public.council_requests(target_user_id, status);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to, status);
create index if not exists idx_tasks_council_id on public.tasks(council_id);
create index if not exists idx_tasks_cycle_week on public.tasks(cycle_week);
create index if not exists idx_submissions_task_id on public.submissions(task_id, status);
create index if not exists idx_submissions_user_id on public.submissions(user_id);
create index if not exists idx_activity_log_user_id on public.activity_log(user_id, created_at desc);
create index if not exists idx_pending_stat_changes_user on public.pending_stat_changes(user_id, applied);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email_notifications)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    true
  )
  on conflict (id) do nothing;

  -- Auto-create an empty council for the new user
  insert into public.councils (owner_id, name)
  values (new.id, 'My Council')
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update profiles.updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Log activity helper function
create or replace function public.log_activity(
  p_user_id  uuid,
  p_type     text,
  p_title    text,
  p_meta     jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (user_id, type, title, meta)
  values (p_user_id, p_type, p_title, p_meta);
end;
$$;

-- On submission approved: create pending stat change + activity log
create or replace function public.handle_submission_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task        record;
  v_stat_name   text;
begin
  -- Only act on transitions to 'approved'
  if new.status = 'approved' and old.status = 'pending' then
    select t.*, sc.name as stat_name
    into v_task
    from public.tasks t
    join public.stat_categories sc on sc.id = t.stat_category_id
    where t.id = new.task_id;

    -- Create pending stat change (applied at cycle end)
    insert into public.pending_stat_changes
      (user_id, stat_category_id, delta, source, source_id)
    values
      (new.user_id, v_task.stat_category_id, 5, 'task', new.id)
    on conflict (source_id) do nothing;

    -- Log activity for the submitter
    perform public.log_activity(
      new.user_id,
      'task_approved',
      v_task.title,
      jsonb_build_object('stat', v_task.stat_name, 'points', 5)
    );

  elsif new.status = 'rejected' and old.status = 'pending' then
    select t.*, sc.name as stat_name
    into v_task
    from public.tasks t
    join public.stat_categories sc on sc.id = t.stat_category_id
    where t.id = new.task_id;

    perform public.log_activity(
      new.user_id,
      'task_rejected',
      v_task.title,
      jsonb_build_object('stat', v_task.stat_name, 'points', 0)
    );

  elsif new.status = 'needs_more' and old.status = 'pending' then
    select t.*, sc.name as stat_name
    into v_task
    from public.tasks t
    join public.stat_categories sc on sc.id = t.stat_category_id
    where t.id = new.task_id;

    perform public.log_activity(
      new.user_id,
      'task_needs_more',
      v_task.title,
      jsonb_build_object('stat', v_task.stat_name, 'points', 0)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_submission_reviewed on public.submissions;
create trigger on_submission_reviewed
  after update on public.submissions
  for each row execute procedure public.handle_submission_approved();

-- Apply pending stat changes (called by cron or manually at cycle end)
create or replace function public.apply_pending_stat_changes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Apply all unapplied pending changes
  update public.user_stats us
  set current_value = us.current_value + psc.delta
  from public.pending_stat_changes psc
  where psc.user_id = us.user_id
    and psc.stat_category_id = us.stat_category_id
    and psc.applied = false;

  -- Mark as applied
  update public.pending_stat_changes
  set applied = true
  where applied = false;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.stat_categories enable row level security;
alter table public.user_stats enable row level security;
alter table public.streaks enable row level security;
alter table public.councils enable row level security;
alter table public.council_members enable row level security;
alter table public.council_requests enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.feedback enable row level security;
alter table public.activity_log enable row level security;
alter table public.pending_stat_changes enable row level security;

-- profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (profile_public = true or auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- stat_categories (read-only for everyone)
create policy "Anyone can read stat categories"
  on public.stat_categories for select
  using (true);

-- user_stats
create policy "Users can read their own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

create policy "Public stats viewable if profile is public"
  on public.user_stats for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id and p.profile_public = true
    )
  );

create policy "Users can insert their own stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own stats"
  on public.user_stats for update
  using (auth.uid() = user_id);

-- streaks
create policy "Users can read their own streaks"
  on public.streaks for select
  using (auth.uid() = user_id);

create policy "Public streaks viewable if profile is public"
  on public.streaks for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id and p.profile_public = true
    )
  );

-- councils
create policy "Anyone can view council metadata"
  on public.councils for select
  using (true);

create policy "Owner can update their council"
  on public.councils for update
  using (auth.uid() = owner_id);

-- council_members: visible to council owner and the member themselves
create policy "Council members visible to owner and members"
  on public.council_members for select
  using (
    auth.uid() = member_id
    or exists (
      select 1 from public.councils c
      where c.id = council_id and c.owner_id = auth.uid()
    )
  );

create policy "Only system can insert council members"
  on public.council_members for insert
  with check (
    -- Owner can insert (for invite flow via API)
    exists (
      select 1 from public.councils c
      where c.id = council_id and c.owner_id = auth.uid()
    )
  );

create policy "Only system can update council members"
  on public.council_members for update
  using (
    auth.uid() = member_id
    or exists (
      select 1 from public.councils c
      where c.id = council_id and c.owner_id = auth.uid()
    )
  );

-- council_requests
create policy "Users can see requests directed at them"
  on public.council_requests for select
  using (auth.uid() = target_user_id or auth.uid() = requester_id);

create policy "Authenticated users can create requests"
  on public.council_requests for insert
  with check (auth.uid() = requester_id);

create policy "Target user can update request status"
  on public.council_requests for update
  using (auth.uid() = target_user_id);

-- tasks
create policy "Tasks visible to assignee and council members"
  on public.tasks for select
  using (
    auth.uid() = assigned_to
    or auth.uid() = assigned_by
    or exists (
      select 1 from public.council_members cm
      where cm.council_id = tasks.council_id
        and cm.member_id = auth.uid()
        and cm.status = 'active'
    )
    or exists (
      select 1 from public.councils c
      where c.id = council_id and c.owner_id = auth.uid()
    )
  );

create policy "Council members and owners can create tasks"
  on public.tasks for insert
  with check (
    auth.uid() = assigned_by
    and (
      exists (select 1 from public.councils c where c.id = council_id and c.owner_id = auth.uid())
      or exists (select 1 from public.council_members cm
        where cm.council_id = tasks.council_id
          and cm.member_id = auth.uid()
          and cm.status = 'active')
    )
  );

-- submissions
create policy "Submissions visible to submitter and council"
  on public.submissions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.tasks t
      join public.councils c on c.id = t.council_id
      where t.id = task_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.tasks t
      join public.council_members cm on cm.council_id = t.council_id
      where t.id = task_id
        and cm.member_id = auth.uid()
        and cm.status = 'active'
    )
  );

create policy "Users can submit their own work"
  on public.submissions for insert
  with check (auth.uid() = user_id);

create policy "Reviewers can update submission status"
  on public.submissions for update
  using (
    exists (
      select 1 from public.tasks t
      join public.councils c on c.id = t.council_id
      where t.id = task_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.tasks t
      join public.council_members cm on cm.council_id = t.council_id
      where t.id = task_id
        and cm.member_id = auth.uid()
        and cm.status = 'active'
    )
  );

-- feedback
create policy "Feedback visible to submission owner and reviewers"
  on public.feedback for select
  using (
    auth.uid() = reviewer_id
    or exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.user_id = auth.uid()
    )
  );

create policy "Council members and owners can insert feedback"
  on public.feedback for insert
  with check (auth.uid() = reviewer_id);

-- activity_log
create policy "Users can read their own activity"
  on public.activity_log for select
  using (auth.uid() = user_id);

-- pending_stat_changes
create policy "Users can read their own pending changes"
  on public.pending_stat_changes for select
  using (auth.uid() = user_id);

-- ============================================================
-- SEED: stat_categories
-- ============================================================
insert into public.stat_categories (name, icon, description) values
  ('Strength', '💪', 'Physical power, muscle, and athletic capacity'),
  ('Discipline', '⚔️', 'Focus, consistency, and daily habits'),
  ('Charisma', '✨', 'Social confidence, communication, and presence'),
  ('Intelligence', '🧠', 'Learning, problem-solving, and mental sharpness'),
  ('Creativity', '🎨', 'Original thinking, art, and expression'),
  ('Resilience', '🛡️', 'Mental toughness and recovery under pressure'),
  ('Wealth', '💰', 'Financial literacy, income, and money habits'),
  ('Health', '❤️', 'Nutrition, sleep, recovery, and wellbeing'),
  ('Leadership', '🎯', 'Influence, decision-making, and team building'),
  ('Craft', '🔨', 'Technical skills, mastery, and professional expertise')
on conflict (name) do nothing;