# Supabase Scripts

Run these scripts in order via the Supabase Dashboard SQL Editor.

| Script | Purpose |
|--------|---------|
| `01-create-profiles-table.sql` | Creates the `profiles` table with RLS policies |
| `02-create-profile-trigger.sql` | Auto-creates a profile on user signup via trigger |
| `03-add-wallet-columns.sql` | Adds wallet address and encrypted seed phrase columns |
| `04-add-expert-profile-fields.sql` | Adds expert profile fields (bio, headline, expertise, rate, socials) + public read policy |

## Notes

- Run `01` first if setting up from scratch. If the table already exists, skip it.
- Run `02` to set up the trigger (safe to re-run — uses `create or replace`).
