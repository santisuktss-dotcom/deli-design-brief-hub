-- Cleans up any partially-created objects from a previous failed run, so the
-- full combined_migrations.sql can be re-applied cleanly from scratch.

drop table if exists monthly_report_snapshots cascade;
drop table if exists notifications cascade;
drop table if exists brief_comments cascade;
drop table if exists brief_submissions cascade;
drop table if exists brief_files cascade;
drop table if exists brief_history cascade;
drop table if exists brief_assignments cascade;
drop table if exists briefs cascade;
drop table if exists team_capacity_defaults cascade;
drop table if exists company_holidays cascade;
drop table if exists designer_allowlist cascade;
drop table if exists profiles cascade;

drop function if exists check_designer_allowlist(text) cascade;
drop function if exists designer_allowlist_entry(text) cascade;
drop function if exists next_brief_code() cascade;
drop function if exists is_blocked_date(date) cascade;
drop function if exists create_brief(text, brief_category, text, text, text, int, int, date, text, text) cascade;
drop function if exists accept_brief(uuid) cascade;
drop function if exists assign_designer(uuid, uuid) cascade;
drop function if exists submit_work(uuid, text, text) cascade;
drop function if exists approve_brief(uuid) cascade;
drop function if exists request_revision(uuid, text, text) cascade;
drop function if exists cancel_brief(uuid) cascade;
drop function if exists hold_brief(uuid) cascade;
drop function if exists is_manager() cascade;
drop function if exists is_designer() cascade;
drop function if exists is_assigned_designer(uuid) cascade;
drop function if exists set_updated_at() cascade;

drop type if exists user_role cascade;
drop type if exists brief_status cascade;
drop type if exists brief_category cascade;
drop type if exists notification_type cascade;
