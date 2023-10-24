--! Previous: sha1:cbd9782e15eb3c017a7380b5cbaf40c46ecbc7a0
--! Hash: sha1:45fbe6403cd396c81126c49b8cbbf8b770c62043

-- Enter migration here

alter table if exists app_public.report_templates
    rename to workflow_templates;

alter table app_public.workflow_templates
    alter column organization_id drop not null;

drop policy if exists all_allowed on app_public.workflow_templates;
drop policy if exists select_allowed on app_public.workflow_templates;
drop policy if exists update_allowed on app_public.workflow_templates;
drop policy if exists insert_allowed on app_public.workflow_templates;

-- can select templates where organization_id is null (default templates)
create policy select_allowed on app_public.workflow_templates for select using (
    organization_id in (select organization_id from app_private.current_user_orgs)
    or organization_id is null
);

-- can only update or insert with appropriate organization_id
create policy update_allowed on app_public.workflow_templates for update using (
    organization_id in (select organization_id from app_private.current_user_orgs)
);

create policy insert_allowed on app_public.workflow_templates for insert with check (
    organization_id in (select organization_id from app_private.current_user_orgs)
);

drop table if exists app_public.report_workflows cascade;

create table app_public.report_workflows (
    id uuid primary key default gen_random_uuid(),
    report_id uuid not null references app_public.reports on delete cascade,
    workflow_template_id uuid not null references app_public.workflow_templates on delete cascade,
    name text,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz default null
);

create index on app_public.report_workflows (report_id);
create index on app_public.report_workflows (workflow_template_id);

create trigger _100_timestamps
  before insert or update on app_public.report_workflows
  for each row
  execute procedure app_private.tg__timestamps();

alter table app_public.report_workflows enable row level security;

grant select on app_public.report_workflows to :DATABASE_VISITOR;
grant insert on app_public.report_workflows to :DATABASE_VISITOR;

drop policy if exists all_allowed on app_public.report_workflows;

create policy all_allowed on app_public.report_workflows for all using (
    report_id in (
        select id from app_private.current_user_org_reports
    )
);

drop table if exists app_public.report_workflow_workspaces cascade;

create table app_public.report_workflow_workspaces (
    id uuid primary key default gen_random_uuid(),
    report_workflow_id uuid not null references app_public.report_workflows on delete cascade,
    key text not null,
    name text,
    description text,
    workspace_order integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz default null
);

create index on app_public.report_workflow_workspaces (report_workflow_id);
create index on app_public.report_workflow_workspaces (workspace_order);

create trigger _100_timestamps
  before insert or update on app_public.report_workflow_workspaces
  for each row
  execute procedure app_private.tg__timestamps();

alter table app_public.report_workflow_workspaces enable row level security;

grant select on app_public.report_workflow_workspaces to :DATABASE_VISITOR;
grant insert on app_public.report_workflow_workspaces to :DATABASE_VISITOR;

drop policy if exists all_allowed on app_public.report_workflow_workspaces;

create policy all_allowed on app_public.report_workflow_workspaces for all using (
    report_workflow_id in (
        select rw.id from app_public.report_workflows rw
        inner join app_public.reports r
        on r.id = rw.report_id
        inner join app_private.current_user_org_reports cuor
        on cuor.id = r.id
    )
);

drop table if exists app_public.report_workflow_workspace_steps cascade;

create table app_public.report_workflow_workspace_steps (
    id uuid primary key default gen_random_uuid(),
    report_workflow_workspace_id uuid not null references app_public.report_workflow_workspaces on delete cascade,
    name text,
    key text not null,
    description text,
    status text,
    sections JSON,
    step_order integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz default null
);

create index on app_public.report_workflow_workspace_steps (report_workflow_workspace_id);
create index on app_public.report_workflow_workspace_steps (step_order);

create trigger _100_timestamps
  before insert or update on app_public.report_workflow_workspace_steps
  for each row
  execute procedure app_private.tg__timestamps();

alter table app_public.report_workflow_workspace_steps enable row level security;

grant select on app_public.report_workflow_workspace_steps to :DATABASE_VISITOR;
grant insert on app_public.report_workflow_workspace_steps to :DATABASE_VISITOR;
grant update on app_public.report_workflow_workspace_steps to :DATABASE_VISITOR;

create policy all_allowed on app_public.report_workflow_workspace_steps for all using (
    report_workflow_workspace_id in (
        select rww.id from app_public.report_workflow_workspaces rww
        inner join app_public.report_workflows rw
        on rww.report_workflow_id = rw.id
        inner join app_public.reports r
        on rw.report_id = r.id
        inner join app_private.current_user_org_reports cuor
        on r.id = cuor.id
    )
);

alter table app_public.reports
    add column if not exists workflow_template_id uuid references app_public.workflow_templates;

create index on app_public.reports (workflow_template_id);

alter table app_public.report_workflow_workspaces
    drop column if exists report_workflow_id cascade,
    add column if not exists report_id uuid not null references app_public.reports on delete cascade;

create index on app_public.report_workflow_workspaces (report_id);

drop table if exists app_public.report_workflows cascade;

drop policy if exists all_allowed on app_public.report_workflow_workspaces cascade;

create policy all_allowed on app_public.report_workflow_workspaces for all using (
    report_id in (
        select id from app_private.current_user_org_reports
    )
);

drop policy if exists all_allowed on app_public.report_workflow_workspace_steps cascade;

create policy all_allowed on app_public.report_workflow_workspace_steps for all using (
    report_workflow_workspace_id in (
        select rww.id from app_public.report_workflow_workspaces rww
        inner join app_public.reports r
        on rww.report_id = r.id
        inner join app_private.current_user_org_reports cuor
        on cuor.id = r.id
    )
);

-- update function to use readyForRefresh review_status
create or replace function app_private.set_report_review_status() returns trigger as $$
declare v_processing_count bigint;
        v_user_id uuid;
begin
    if NEW.update_status in ('success', 'error') then
        -- count processing resolutions
        select count(*)::bigint
        from app_public.report_resolutions
        where update_status in ('queued', 'processing')
        and report_id = NEW.report_id
        into v_processing_count;

        if v_processing_count = 0 then
            update app_public.reports
            set review_status = 'readyForRefresh'
            where id = NEW.report_id;

            -- create a notification, but not for undo operations
            if OLD.update_status != 'success' then
                -- get user id for notification
                select owner_id
                from app_public.reports
                where id = NEW.report_id
                into v_user_id;

                insert into app_public.user_notifications
                (user_id, level, kind, title, meta)
                values
                (v_user_id, 'info', 'sync-complete', 'Sync completed.', json_build_object('reportId', NEW.report_id));
            end if;
        end if;
    end if;
  return NEW;
end;
$$ language plpgsql volatile set search_path to pg_catalog, public, pg_temp;

create index on app_public.reports (review_status);

alter table app_public.reports
    add column if not exists source_kind text;

-- add on delete cascade to workflow_template_id column
drop index if exists reports_workflow_template_id_idx;

alter table app_public.reports
    drop column if exists workflow_template_id,
    add column workflow_template_id uuid references app_public.workflow_templates on delete cascade;

create index on app_public.reports (workflow_template_id);

-- update trigger to remove user notification
create or replace function app_private.set_report_review_status() returns trigger as $$
declare v_processing_count bigint;
        v_user_id uuid;
begin
    if NEW.update_status in ('success', 'error') then
        -- count processing resolutions
        select count(*)::bigint
        from app_public.report_resolutions
        where update_status in ('queued', 'processing')
        and report_id = NEW.report_id
        into v_processing_count;

        if v_processing_count = 0 then
            update app_public.reports
            set review_status = 'readyForRefresh'
            where id = NEW.report_id;
        end if;
    end if;
  return NEW;
end;
$$ language plpgsql volatile set search_path to pg_catalog, public, pg_temp;

create index on app_public.workflow_templates (name);

create index on app_public.report_user_files (type);
