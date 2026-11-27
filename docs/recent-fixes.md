# Recent fixes from issue reports

Apply `supabase/recent_fixes.sql` after `supabase/issue_reports.sql`, then deploy the updated planner. The migration is rerunnable and retains existing published fixes, including the Si acknowledgement.

In **Admin → Reports**, **Resolve & publish fix** saves the resolved status and the public fix entry in one transaction. The admin can edit the public title and explanation before resolving; leaving them empty uses generic defaults. Private descriptions, links, team context and internal review notes are never copied into the public entry. All reports currently use the anonymous reporting form, so the acknowledgement thanks the anonymous reporter.

The planner reads only the public copy through `list_recent_fixes`, groups entries by the Europe/Berlin calendar date and retains its existing history if loading fails. Restoring or dismissing a report hides its fix entry. Resolving it again reuses the same entry; repeated resolves do not duplicate or redate an already-resolved entry.

The existing `set_issue_report_status` RPC remains supported. Its resolved action also publishes safe default copy. The new admin UI uses `resolve_issue_report_with_fix` so custom public copy and the status change cannot succeed separately. Run `recent_fixes.sql` again if an older report migration has replaced the status RPC.
