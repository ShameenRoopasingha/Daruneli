# Automated Clinic & Vaccination SMS Reminders (`send-clinic-reminders`)

This Supabase Edge Function dispatches polite maternal & child clinic/vaccine SMS reminders **2 days in advance** to registered Sri Lankan families via the **Notify.lk HTTP API**.

---

## 1. Features
- **Smart Date Window:** Queries active visits, appointments, and pending EPI vaccines due on `CURRENT_DATE + 2`.
- **Deduplication:** Relies on `sms_reminder_logs` table constraint `UNIQUE (target_id, reminder_type, due_date)` to ensure no mother receives duplicate reminders.
- **Residency Filter:** Automatically excludes `TEMP_OUT` (temporarily moved away) and `TRANSFERRED_OUT` families.
- **Strict `DD/MM/YYYY` Dates:** All text message bodies format dates in strict Sri Lankan standard `DD/MM/YYYY`.
- **Dry-Run Mode:** Supports testing without consuming Notify.lk SMS credits (`SMS_DRY_RUN=true`).

---

## 2. Configuration & Secrets

Set required secrets in Supabase CLI:

```bash
# Notify.lk API credentials
supabase secrets set NOTIFY_USER_ID="your_user_id"
supabase secrets set NOTIFY_API_KEY="your_api_key"
supabase secrets set NOTIFY_SENDER_ID="SuwaPHM"

# Optional: Enable Dry-Run mode to log payloads without sending actual SMS
supabase secrets set SMS_DRY_RUN="false"
```

---

## 3. Deploying the Edge Function

Deploy using the Supabase CLI:

```bash
supabase functions deploy send-clinic-reminders --no-verify-jwt
```

---

## 4. Daily Automated Scheduling with `pg_cron`

To trigger reminders every morning at **8:00 AM Sri Lanka Time (02:30 UTC)**, execute the following SQL in your Supabase SQL Editor:

```sql
-- 1. Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule daily dispatch job at 02:30 UTC (08:00 AM SLST)
SELECT cron.schedule(
  'send-clinic-reminders-daily-0800',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/send-clinic-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. Verify schedule
SELECT * FROM cron.job WHERE jobname = 'send-clinic-reminders-daily-0800';
```
