import { isDemoMode, createClient } from './supabase/client';
import {
  MOCK_AREAS,
  MOCK_ESCALATIONS,
  MOCK_H509_COMBINED,
  MOCK_TIMETABLES,
  MOCK_OVERRIDES,
  MOCK_TRANSFERS,
  MOCK_SMS_LOGS,
  CURRENT_USER,
  MOCK_STAFF,
  MOCK_AUDIT_LOGS,
} from './mockData';
import {
  PhmAreaSummary,
  EscalationAlert,
  H509Report,
  TimetableTemplateItem,
  ScheduleOverrideItem,
  MotherTransferItem,
  SmsLogItem,
  UserProfile,
  ReviewStatus,
  StaffMember,
  UserAuditLogItem,
} from './types';

// In-memory / localStorage storage for supervision notes created in Demo Mode
const DEMO_NOTES_KEY = 'suwa_demo_supervision_notes';

function getDemoNotes(): Record<string, any[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DEMO_NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDemoNote(alertId: string, noteObj: any) {
  if (typeof window === 'undefined') return;
  try {
    const all = getDemoNotes();
    if (!all[alertId]) all[alertId] = [];
    all[alertId].unshift(noteObj);
    localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to save demo note to localStorage:', e);
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile> {
  if (isDemoMode) {
    return CURRENT_USER;
  }

  const supabase = createClient();
  if (!supabase) return CURRENT_USER;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return CURRENT_USER;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, phm_areas(phm_area_name, moh_division)')
    .eq('id', user.id)
    .single();

  if (!profile) return CURRENT_USER;

  const areaInfo = (profile as any).phm_areas;
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role as any,
    mohDivision: areaInfo?.moh_division || 'Maharagama MOH Division',
    phmAreaId: null,
    phmAreaName: areaInfo?.phm_area_name || null,
  };
}

export async function getAreaSummaries(): Promise<PhmAreaSummary[]> {
  if (isDemoMode) {
    return MOCK_AREAS;
  }

  const supabase = createClient();
  if (!supabase) return MOCK_AREAS;

  try {
    const { data, error } = await supabase
      .from('v_phm_area_scorecards')
      .select('*')
      .order('phm_area_code', { ascending: true });

    if (error || !data || data.length === 0) {
      return MOCK_AREAS;
    }

    return data.map((row: any) => {
      const lastSync = row.last_sync_at || new Date().toISOString();
      const elapsedHours = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);

      return {
        id: row.phm_area_id,
        code: row.phm_area_code,
        name: row.phm_area_name,
        mohDivision: row.moh_division,
        gnDivisions: [],
        phmOfficerName: 'PHM Officer',
        phmOfficerPhone: '-',
        activeMothers: row.active_pregnancies_count || 0,
        redRiskCount: row.red_risk_count || 0,
        yellowRiskCount: row.yellow_risk_count || 0,
        greenRiskCount: row.green_risk_count || 0,
        activeChildren: row.active_children_count || 0,
        mamCount: row.mam_count || 0,
        samCount: row.sam_count || 0,
        growthFalteringCount: row.growth_faltering_count || 0,
        overdueTasksCount: row.overdue_tasks_count || 0,
        overdueVaccinesCount: row.overdue_vaccines_count || 0,
        lastSyncAt: lastSync,
        syncHealth: elapsedHours > 48 ? 'CRITICAL' : elapsedHours > 24 ? 'WARNING' : 'HEALTHY',
      };
    });
  } catch {
    return MOCK_AREAS;
  }
}

export async function getEscalationAlerts(filters?: {
  areaId?: string;
  category?: string;
  status?: string;
}): Promise<EscalationAlert[]> {
  // Demo mode or offline fallback
  let list = [...MOCK_ESCALATIONS];

  // Merge any locally added demo notes
  if (typeof window !== 'undefined') {
    const localNotes = getDemoNotes();
    list = list.map((item) => {
      const notes = localNotes[item.id];
      if (notes && notes.length > 0) {
        return {
          ...item,
          status: notes[0].status || item.status,
          supervisionNotes: [...notes, ...(item.supervisionNotes || [])],
        };
      }
      return item;
    });
  }

  if (filters?.areaId && filters.areaId !== 'ALL') {
    list = list.filter((item) => item.phmAreaId === filters.areaId);
  }
  if (filters?.category && filters.category !== 'ALL') {
    list = list.filter((item) => item.category === filters.category);
  }
  if (filters?.status && filters.status !== 'ALL') {
    list = list.filter((item) => item.status === filters.status);
  }

  return list;
}

export async function getEscalationById(id: string): Promise<EscalationAlert | null> {
  const alerts = await getEscalationAlerts();
  return alerts.find((a) => a.id === id) || null;
}

export async function submitSupervisionDirective(
  alertId: string,
  noteText: string,
  status: ReviewStatus,
  authorRole: 'PHNS' | 'MOH' = 'MOH'
): Promise<boolean> {
  const noteObj = {
    id: `sn_local_${Date.now()}`,
    mohDivision: 'Maharagama MOH Division',
    phmAreaId: 'area_kot_north',
    targetType: 'MOTHER',
    targetId: alertId,
    authorId: CURRENT_USER.id,
    authorName: CURRENT_USER.fullName,
    authorRole,
    status,
    note: noteText,
    createdAt: new Date().toISOString(),
  };

  if (isDemoMode) {
    saveDemoNote(alertId, noteObj);
    return true;
  }

  const supabase = createClient();
  if (!supabase) {
    saveDemoNote(alertId, noteObj);
    return true;
  }

  try {
    const { error } = await supabase.from('supervision_notes').insert({
      moh_division: 'Maharagama MOH Division',
      phm_area_id: '00000000-0000-0000-0000-000000000000', // fallback or real area id
      target_type: 'MOTHER',
      target_id: alertId,
      author_id: CURRENT_USER.id,
      author_role: authorRole,
      status: status === 'UNREVIEWED' ? 'ACKNOWLEDGED' : status,
      note: noteText,
    });

    if (error) {
      console.warn('Supabase insert note error, saved locally:', error);
      saveDemoNote(alertId, noteObj);
    }
    return true;
  } catch (err) {
    console.warn('Network error, saved locally:', err);
    saveDemoNote(alertId, noteObj);
    return true;
  }
}

export async function getH509Report(
  month: number,
  year: number,
  areaId?: string | null
): Promise<H509Report> {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const periodStr = `${monthNames[month - 1]} ${year}`;

  const base = { ...MOCK_H509_COMBINED };
  base.metadata = {
    ...base.metadata,
    reportingPeriod: periodStr,
    phmAreaName: areaId && areaId !== 'ALL'
      ? MOCK_AREAS.find((a) => a.id === areaId)?.name || 'Selected PHM Area'
      : 'Entire Division (Combined 5 PHM Areas)',
  };

  // If specific area selected, scale down sample numbers realistically
  if (areaId && areaId !== 'ALL') {
    const area = MOCK_AREAS.find((a) => a.id === areaId);
    return {
      metadata: {
        ...base.metadata,
        phmAreaId: area?.id || null,
        phmAreaName: area ? `${area.name} (${area.code})` : 'Individual PHM Area',
        phmOfficerName: area?.phmOfficerName || 'PHM Midwife',
      },
      section1_antenatal: {
        totalEligibleFamilies: 368,
        activeMothers: area?.activeMothers || 40,
        newRegistrationsThisMonth: 6,
        registeredBefore12Weeks: 5,
        riskBreakdown: {
          red: area?.redRiskCount || 5,
          yellow: area?.yellowRiskCount || 12,
          green: area?.greenRiskCount || 23,
        },
        totalHomeVisits: 64,
        totalClinicVisits: 40,
        mothersWithLowHb: 3,
        urgentHospitalReferrals: 1,
      },
      section2_deliveries: {
        totalDeliveries: 4,
        normalVaginalDeliveries: 3,
        cesareanSections: 1,
        instrumentalDeliveries: 0,
        liveBirths: 4,
        stillbirths: 0,
        miscarriages: 0,
        lowBirthWeightBabies: 1,
      },
      section3_childHealth: {
        registeredChildren0to5: area?.activeChildren || 130,
        weighedThisMonth: Math.round((area?.activeChildren || 130) * 0.9),
        weighingPercentage: 90.0,
        nutritionStatus: {
          normal: (area?.activeChildren || 130) - (area?.mamCount || 3) - (area?.samCount || 1),
          mam: area?.mamCount || 3,
          sam: area?.samCount || 1,
        },
        growthFalteringCount: area?.growthFalteringCount || 2,
      },
      section4_immunization: {
        bcgCount: 4,
        pentavalentCount: 16,
        mmrCount: 14,
        opvCount: 16,
        overdueVaccinesCount: area?.overdueVaccinesCount || 2,
      },
      section5_appendix: {
        highRiskMothers: base.section5_appendix.highRiskMothers.filter((m) =>
          m.phmArea.includes(area?.name || '')
        ),
        overdueTasks: base.section5_appendix.overdueTasks.filter((t) =>
          t.phmArea.includes(area?.name || '')
        ),
      },
    };
  }

  return base;
}

export async function getTimetablesForArea(areaId: string): Promise<{
  templates: TimetableTemplateItem[];
  overrides: ScheduleOverrideItem[];
}> {
  const templates = MOCK_TIMETABLES[areaId] || MOCK_TIMETABLES['area_kot_north'] || [];
  const overrides = MOCK_OVERRIDES[areaId] || MOCK_OVERRIDES['area_kot_north'] || [];
  return { templates, overrides };
}

export async function getMotherTransfers(): Promise<MotherTransferItem[]> {
  return MOCK_TRANSFERS;
}

export async function getSmsLogs(): Promise<SmsLogItem[]> {
  return MOCK_SMS_LOGS;
}

export async function getStaffMembers(): Promise<{ staff: StaffMember[]; auditLogs: UserAuditLogItem[] }> {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) {
      // In case api returns 401/403 or fallback
      return { staff: [...MOCK_STAFF], auditLogs: [...MOCK_AUDIT_LOGS] };
    }
    const json = await res.json();
    if (json.success && json.data) {
      return { staff: json.data, auditLogs: json.auditLogs || [] };
    }
    return { staff: [...MOCK_STAFF], auditLogs: [...MOCK_AUDIT_LOGS] };
  } catch (err) {
    console.warn('Failed to fetch /api/admin/users, falling back to mock staff:', err);
    return { staff: [...MOCK_STAFF], auditLogs: [...MOCK_AUDIT_LOGS] };
  }
}

export async function createStaffMember(payload: {
  fullName: string;
  email: string;
  phone: string;
  employeeId: string;
  role: 'PHM' | 'PHNS';
  phmAreaId?: string | null;
  preferredLang?: 'si' | 'ta' | 'en';
  tempPassword?: string;
  sendInvite?: boolean;
}): Promise<{ success: boolean; message: string; data?: StaffMember }> {
  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error occurred while creating staff.' };
  }
}

export async function updateStaffMember(
  id: string,
  payload: {
    fullName?: string;
    email?: string;
    phone?: string;
    employeeId?: string;
    role?: 'PHM' | 'PHNS';
    phmAreaId?: string | null;
    preferredLang?: 'si' | 'ta' | 'en';
  }
): Promise<{ success: boolean; message: string; data?: StaffMember }> {
  try {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error occurred while updating staff profile.' };
  }
}

export async function toggleStaffStatus(
  id: string,
  isActive: boolean,
  reason?: string
): Promise<{ success: boolean; message: string; data?: StaffMember }> {
  try {
    const res = await fetch(`/api/admin/users/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive, reason }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error occurred while toggling staff status.' };
  }
}

export async function resetStaffPassword(
  id: string,
  options: { tempPassword?: string; sendEmail?: boolean }
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error occurred while resetting password.' };
  }
}

