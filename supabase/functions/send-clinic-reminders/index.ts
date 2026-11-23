// Deno TypeScript Supabase Edge Function: send-clinic-reminders
// Dispatches automated SMS reminders 2 days ahead of clinic visits and child vaccinations via Notify.lk
// Scheduled to run daily at 02:30 UTC (08:00 AM Sri Lanka Time) via pg_cron

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface TaskReminderCandidate {
  id: string;
  target_type: 'MOTHER' | 'CHILD';
  target_id: string;
  task_type: string;
  due_date: string;
  notes: string | null;
  phm_area_id: string | null;
  phone: string | null;
  name: string | null;
  language: string | null;
}

interface VaccineReminderCandidate {
  id: string;
  child_id: string;
  child_name: string;
  vaccine_code: string;
  vaccine_name: string;
  scheduled_date: string;
  phm_area_id: string | null;
  phone: string | null;
  language: string | null;
}

function formatDisplayDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

function normalizeSriLankanPhone(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('94')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return `94${digits}`;
  }
  return null;
}

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const isDryRun = Deno.env.get('SMS_DRY_RUN') === 'true';
    const notifyUserId = Deno.env.get('NOTIFY_USER_ID') || '';
    const notifyApiKey = Deno.env.get('NOTIFY_API_KEY') || '';
    const notifySenderId = Deno.env.get('NOTIFY_SENDER_ID') || 'NotifyDEMO';

    // 1. Calculate Target Date: CURRENT_DATE + 2 days
    const targetDateObj = new Date();
    targetDateObj.setDate(targetDateObj.getDate() + 2);
    const targetDateStr = targetDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
    const displayTargetDate = formatDisplayDate(targetDateStr); // DD/MM/YYYY

    console.log(`[SMS-Reminder] Starting run for due date: ${targetDateStr} (${displayTargetDate}), DryRun=${isDryRun}`);

    let processedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;

    // 2. Query Tasks due in 2 days (Excluding TEMP_OUT / TRANSFERRED_OUT families)
    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        target_type,
        target_id,
        task_type,
        due_date,
        notes,
        phm_area_id,
        mothers!left(
          full_name,
          phone,
          families!inner(residency_status)
        ),
        children!left(
          full_name,
          mothers!inner(
            phone,
            families!inner(residency_status)
          )
        )
      `)
      .eq('due_date', targetDateStr)
      .eq('status', 'OPEN')
      .is('deleted_at', null);

    if (taskError) {
      console.error('[SMS-Reminder] Error querying tasks:', taskError);
    }

    // 3. Query Child Immunizations due in 2 days (Excluding TEMP_OUT / TRANSFERRED_OUT families)
    const { data: vaccineRows, error: vaxError } = await supabase
      .from('immunizations')
      .select(`
        id,
        child_id,
        vaccine_code,
        vaccine_name,
        scheduled_date,
        phm_area_id,
        children!inner(
          full_name,
          mothers!inner(
            phone,
            families!inner(residency_status)
          )
        )
      `)
      .eq('scheduled_date', targetDateStr)
      .eq('status', 'PENDING')
      .is('deleted_at', null);

    if (vaxError) {
      console.error('[SMS-Reminder] Error querying immunizations:', vaxError);
    }

    // --- Process Antenatal & Home Visit Tasks ---
    if (taskRows && taskRows.length > 0) {
      for (const row of taskRows as any[]) {
        processedCount++;
        const targetType = row.target_type;
        const targetId = row.target_id;
        const reminderType = `TASK_${row.task_type}`;

        const isMother = targetType === 'MOTHER';
        const familyStatus = isMother
          ? row.mothers?.families?.residency_status
          : row.children?.mothers?.families?.residency_status;

        // Skip non-active residency
        if (familyStatus === 'TEMP_OUT' || familyStatus === 'TRANSFERRED_OUT') {
          skippedCount++;
          continue;
        }

        const rawPhone = isMother ? row.mothers?.phone : row.children?.mothers?.phone;
        const targetPhone = normalizeSriLankanPhone(rawPhone);
        const name = isMother ? row.mothers?.full_name : row.children?.full_name;

        if (!targetPhone) {
          skippedCount++;
          continue;
        }

        // Check deduplication log
        const { data: existingLog } = await supabase
          .from('sms_reminder_logs')
          .select('id')
          .eq('target_id', targetId)
          .eq('reminder_type', reminderType)
          .eq('due_date', targetDateStr)
          .maybeSingle();

        if (existingLog) {
          skippedCount++;
          continue;
        }

        // Compose Message (Always DD/MM/YYYY date)
        const messageBody = `ආයුබෝවන් ${name || 'මව'}, ඔබගේ සායන/සෞඛ්‍ය පරීක්ෂාව ${displayTargetDate} දිනට නියමිතයි. කරුණාකර සායනයට පැමිණෙන්න හෝ නිවසේ රැඳී සිටින්න. - ඔබගේ PHM මහත්මිය (සුව/දරුනැළි)`;

        let providerStatus = 'SUCCESS';
        if (isDryRun) {
          console.log(`[SMS-DryRun] To: ${targetPhone} | Body: ${messageBody}`);
          providerStatus = 'DRY_RUN_SUCCESS';
        } else if (notifyUserId && notifyApiKey) {
          try {
            const formData = new URLSearchParams();
            formData.append('user_id', notifyUserId);
            formData.append('api_key', notifyApiKey);
            formData.append('sender_id', notifySenderId);
            formData.append('to', targetPhone);
            formData.append('message', messageBody);

            const res = await fetch('https://app.notify.lk/api/v1/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString(),
            });
            const resJson = await res.json();
            providerStatus = resJson.status === 'success' ? 'SENT' : `NOTIFY_ERR: ${resJson.message}`;
          } catch (e: any) {
            providerStatus = `FAILED: ${e?.message || 'Network error'}`;
          }
        } else {
          providerStatus = 'SKIPPED_NO_API_KEYS';
        }

        // Record in sms_reminder_logs
        await supabase.from('sms_reminder_logs').insert({
          phm_area_id: row.phm_area_id,
          target_type: targetType,
          target_id: targetId,
          phone: targetPhone,
          reminder_type: reminderType,
          due_date: targetDateStr,
          message_body: messageBody,
          provider_status: providerStatus,
        });

        sentCount++;
      }
    }

    // --- Process Child Immunization Tasks ---
    if (vaccineRows && vaccineRows.length > 0) {
      for (const row of vaccineRows as any[]) {
        processedCount++;
        const targetId = row.child_id;
        const reminderType = `VAX_${row.vaccine_code}`;
        const familyStatus = row.children?.mothers?.families?.residency_status;

        if (familyStatus === 'TEMP_OUT' || familyStatus === 'TRANSFERRED_OUT') {
          skippedCount++;
          continue;
        }

        const rawPhone = row.children?.mothers?.phone;
        const targetPhone = normalizeSriLankanPhone(rawPhone);
        const childName = row.children?.full_name;

        if (!targetPhone) {
          skippedCount++;
          continue;
        }

        // Check deduplication log
        const { data: existingLog } = await supabase
          .from('sms_reminder_logs')
          .select('id')
          .eq('target_id', targetId)
          .eq('reminder_type', reminderType)
          .eq('due_date', targetDateStr)
          .maybeSingle();

        if (existingLog) {
          skippedCount++;
          continue;
        }

        // Compose Message (Always DD/MM/YYYY date)
        const messageBody = `ආයුබෝවන්, ${childName || 'බබා'}ගේ ${row.vaccine_code} (${row.vaccine_name}) එන්නත ${displayTargetDate} දිනට නියමිතයි. කරුණාකර සායනික පොත රැගෙන එන්න. - ඔබගේ PHM මහත්මිය (සුව/දරුනැළි)`;

        let providerStatus = 'SUCCESS';
        if (isDryRun) {
          console.log(`[SMS-DryRun] To: ${targetPhone} | Body: ${messageBody}`);
          providerStatus = 'DRY_RUN_SUCCESS';
        } else if (notifyUserId && notifyApiKey) {
          try {
            const formData = new URLSearchParams();
            formData.append('user_id', notifyUserId);
            formData.append('api_key', notifyApiKey);
            formData.append('sender_id', notifySenderId);
            formData.append('to', targetPhone);
            formData.append('message', messageBody);

            const res = await fetch('https://app.notify.lk/api/v1/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString(),
            });
            const resJson = await res.json();
            providerStatus = resJson.status === 'success' ? 'SENT' : `NOTIFY_ERR: ${resJson.message}`;
          } catch (e: any) {
            providerStatus = `FAILED: ${e?.message || 'Network error'}`;
          }
        } else {
          providerStatus = 'SKIPPED_NO_API_KEYS';
        }

        // Record in sms_reminder_logs
        await supabase.from('sms_reminder_logs').insert({
          phm_area_id: row.phm_area_id,
          target_type: 'CHILD',
          target_id: targetId,
          phone: targetPhone,
          reminder_type: reminderType,
          due_date: targetDateStr,
          message_body: messageBody,
          provider_status: providerStatus,
        });

        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        targetDueDate: targetDateStr,
        displayDate: displayTargetDate,
        dryRun: isDryRun,
        processedCount,
        sentCount,
        skippedCount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[SMS-Reminder] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
