import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from './database';
import { generateEPISchedule } from '../engine/epiScheduler';

export const SEED_IDS = {
  F1: 'f0000001-0000-0000-0000-000000000001',
  F2: 'f0000002-0000-0000-0000-000000000002',
  F3: 'f0000003-0000-0000-0000-000000000003',
  F4: 'f0000004-0000-0000-0000-000000000004',
  F5: 'f0000005-0000-0000-0000-000000000005',
  F6: 'f0000006-0000-0000-0000-000000000006',

  M1: 'a1000001-0000-0000-0000-000000000001',
  M2: 'a1000002-0000-0000-0000-000000000002',
  M3: 'a1000003-0000-0000-0000-000000000003',
  M4: 'a1000004-0000-0000-0000-000000000004',
  M5: 'a1000005-0000-0000-0000-000000000005',
  M6: 'a1000006-0000-0000-0000-000000000006',

  P1: 'b2000001-0000-0000-0000-000000000001',
  P2: 'b2000002-0000-0000-0000-000000000002',
  P3: 'b2000003-0000-0000-0000-000000000003',
  P4: 'b2000004-0000-0000-0000-000000000004',
  P5: 'b2000005-0000-0000-0000-000000000005',
  P6: 'b2000006-0000-0000-0000-000000000006',

  C1: 'c0000001-0000-0000-0000-000000000001',
  C2: 'c0000002-0000-0000-0000-000000000002',
  C3: 'c0000003-0000-0000-0000-000000000003',
  C4: 'c0000004-0000-0000-0000-000000000004',
  C5: 'c0000005-0000-0000-0000-000000000005',
};

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

export async function seedDatabase(force: boolean = false, dbInstance?: SQLiteDatabase): Promise<void> {
  const db = dbInstance || (await getDatabase());

  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM families WHERE deleted_at IS NULL'
  );

  if (!force && countRow && countRow.count > 0) {
    return;
  }

  const now = new Date().toISOString();

  // Clean existing data if force
  if (force) {
    await db.execAsync(`
      DELETE FROM postnatal_meows;
      DELETE FROM fetal_kick_logs;
      DELETE FROM schedule_overrides;
      DELETE FROM schedule_templates;
      DELETE FROM tasks;
      DELETE FROM immunizations;
      DELETE FROM child_growth_records;
      DELETE FROM children;
      DELETE FROM antenatal_visits;
      DELETE FROM pregnancies;
      DELETE FROM mothers;
      DELETE FROM families;
    `);
  }

  // 1. Families
  await db.execAsync(`
    INSERT INTO families (id, eligible_family_no, gn_division, address, husband_name, emergency_phone, residency_status, created_at, updated_at)
    VALUES 
      ('${SEED_IDS.F1}', 'EF/KOT/001', 'Kottawa North', '42, Temple Road, Kottawa', 'Ruwan Perera', '0771234561', 'ACTIVE', '${now}', '${now}'),
      ('${SEED_IDS.F2}', 'EF/KOT/002', 'Kottawa South', '15, Galle Road, Kottawa', 'Kasun Silva', '0772345672', 'ACTIVE', '${now}', '${now}'),
      ('${SEED_IDS.F3}', 'EF/KOT/003', 'Kottawa North', '88, Lake View, Kottawa', 'Nuwan Fernando', '0773456783', 'ACTIVE', '${now}', '${now}'),
      ('${SEED_IDS.F4}', 'EF/MAH/001', 'Maharagama East', '23, Station Road, Maharagama', 'Dinesh Jayawardena', '0774567894', 'ACTIVE', '${now}', '${now}'),
      ('${SEED_IDS.F5}', 'EF/MAH/002', 'Maharagama West', '7, Hospital Lane, Maharagama', 'Pradeep Bandara', '0775678905', 'ACTIVE', '${now}', '${now}'),
      ('${SEED_IDS.F6}', 'EF/KOT/004', 'Kottawa South', '55, New Road, Kottawa', 'Chaminda Rathnayake', '0776789016', 'ACTIVE', '${now}', '${now}');
  `);

  // 2. Mothers
  await db.execAsync(`
    INSERT INTO mothers (id, family_id, qr_token, full_name, nic, dob, phone, blood_group, chronic_conditions_json, fertility_treatment_history, prev_miscarriages_count, prev_stillbirths_count, prev_c_sections_count, planning_pregnancy, created_at, updated_at)
    VALUES
      ('${SEED_IDS.M1}', '${SEED_IDS.F1}', 'M-QR-0001', 'Nimali Perera', '887654321V', '1989-03-15', '0771122334', 'A+', '[]', 1, 0, 0, 0, 0, '${now}', '${now}'),
      ('${SEED_IDS.M2}', '${SEED_IDS.F2}', 'M-QR-0002', 'Kamala Silva', '917654321V', '1991-07-22', '0772233445', 'B+', '["HYPERTENSION"]', 0, 3, 0, 0, 0, '${now}', '${now}'),
      ('${SEED_IDS.M3}', '${SEED_IDS.F3}', 'M-QR-0003', 'Sachini Fernando', '200712345V', '2007-01-10', '0773344556', 'O+', '["THYROID"]', 0, 1, 0, 0, 0, '${now}', '${now}'),
      ('${SEED_IDS.M4}', '${SEED_IDS.F4}', 'M-QR-0004', 'Dilini Jayawardena', '957654321V', '1995-11-28', '0774455667', 'AB+', '[]', 0, 0, 0, 0, 0, '${now}', '${now}'),
      ('${SEED_IDS.M5}', '${SEED_IDS.F5}', 'M-QR-0005', 'Iresha Bandara', '887654322V', '1988-09-05', '0775566778', 'A-', '["DIABETES","HEART_DISEASE"]', 0, 0, 1, 0, 0, '${now}', '${now}'),
      ('${SEED_IDS.M6}', '${SEED_IDS.F6}', 'M-QR-0006', 'Thilini Rathnayake', '1991765432', '1991-06-18', '0776677889', 'B-', '["PCOS"]', 0, 0, 0, 1, 0, '${now}', '${now}');
  `);

  // 3. Pregnancies
  const p1Lrmp = daysAgo(28 * 7);
  const p1Edd = daysFromNow(12 * 7);
  const p2Lrmp = daysAgo(20 * 7);
  const p2Edd = daysFromNow(20 * 7);
  const p3Lrmp = daysAgo(16 * 7);
  const p3Edd = daysFromNow(24 * 7);
  const p4Lrmp = daysAgo(32 * 7);
  const p4Edd = daysFromNow(8 * 7);
  const p5Lrmp = daysAgo(24 * 7);
  const p5Edd = daysFromNow(16 * 7);
  const p6Lrmp = daysAgo(12 * 7);
  const p6Edd = daysFromNow(28 * 7);

  await db.execAsync(`
    INSERT INTO pregnancies (id, mother_id, gravida, para, lrmp_date, edd_date, is_precious_pregnancy, risk_level, risk_score, risk_factors_json, status, booking_weight_kg, booking_height_cm, booking_bmi, hospital_delivery_notes_json, created_at, updated_at)
    VALUES
      ('${SEED_IDS.P1}', '${SEED_IDS.M1}', 1, 0, '${p1Lrmp}', '${p1Edd}', 1, 'RED', 16, '["Fertility treatment pregnancy", "Precious pregnancy"]', 'ACTIVE', 62.0, 158.0, 24.8, '{"partograph_summary":"Pending delivery","ctg_summary":"Scheduled for weekly CTG from 32w"}', '${now}', '${now}'),
      ('${SEED_IDS.P2}', '${SEED_IDS.M2}', 4, 0, '${p2Lrmp}', '${p2Edd}', 0, 'RED', 17, '["Recurrent miscarriages (3)", "Chronic condition: HYPERTENSION"]', 'ACTIVE', 68.0, 155.0, 28.3, '{}', '${now}', '${now}'),
      ('${SEED_IDS.P3}', '${SEED_IDS.M3}', 2, 0, '${p3Lrmp}', '${p3Edd}', 0, 'YELLOW', 11, '["Young maternal age (19)", "Previous miscarriage (1)", "Condition: THYROID"]', 'ACTIVE', 52.0, 160.0, 20.3, '{}', '${now}', '${now}'),
      ('${SEED_IDS.P4}', '${SEED_IDS.M4}', 2, 1, '${p4Lrmp}', '${p4Edd}', 0, 'GREEN', 0, '[]', 'ACTIVE', 65.0, 162.0, 24.7, '{"delivery_mode":"Spontaneous Vaginal","apgar_1m":9,"apgar_5m":10,"partograph_summary":"Active stage 4.5 hrs, normal cervical curve, clear amniotic fluid","ctg_summary":"Reactive tracing, baseline 140 bpm, normal variability, no decelerations","episiotomy":true}', '${now}', '${now}'),
      ('${SEED_IDS.P5}', '${SEED_IDS.M5}', 3, 1, '${p5Lrmp}', '${p5Edd}', 0, 'RED', 20, '["Previous stillbirth (1)", "Chronic condition: DIABETES", "Chronic condition: HEART_DISEASE"]', 'ACTIVE', 76.0, 156.0, 31.2, '{}', '${now}', '${now}'),
      ('${SEED_IDS.P6}', '${SEED_IDS.M6}', 2, 1, '${p6Lrmp}', '${p6Edd}', 0, 'YELLOW', 10, '["Advanced maternal age (35)", "Previous C-section (1)", "Condition: PCOS"]', 'ACTIVE', 58.0, 160.0, 22.6, '{}', '${now}', '${now}');
  `);

  // 4. Antenatal Visits
  await db.execAsync(`
    INSERT INTO antenatal_visits (id, pregnancy_id, visit_date, visit_type, poa_weeks, sfh_cm, weight_kg, bp_systolic, bp_diastolic, hemoglobin, danger_signs_json, supplements_json, notes, next_visit_date, created_at, updated_at)
    VALUES
      ('d1000001-0000-0000-0000-000000000001', '${SEED_IDS.P1}', '${daysAgo(70)}', 'CLINIC', 18.0, 17.5, 63.8, 112, 72, 11.8, '[]', '["IRON", "FOLIC_ACID"]', 'Early anatomy scan confirmed single live fetus.', '${daysAgo(42)}', '${now}', '${now}'),
      ('d1000002-0000-0000-0000-000000000002', '${SEED_IDS.P1}', '${daysAgo(42)}', 'HOME', 22.0, 21.8, 65.2, 114, 74, 11.6, '[]', '["IRON", "FOLIC_ACID", "CALCIUM"]', 'Fetal quickening felt daily. Growth on track.', '${daysAgo(28)}', '${now}', '${now}'),
      ('d1000003-0000-0000-0000-000000000003', '${SEED_IDS.P1}', '${daysAgo(28)}', 'CLINIC', 24.0, 24.0, 66.5, 115, 75, 11.5, '[]', '["IRON", "FOLIC_ACID", "CALCIUM"]', 'Precious pregnancy monitoring. Fetal heart sounds audible and clear.', '${daysAgo(14)}', '${now}', '${now}'),
      ('d1000004-0000-0000-0000-000000000004', '${SEED_IDS.P1}', '${daysAgo(14)}', 'HOME', 26.0, 26.2, 67.8, 118, 76, 11.2, '[]', '["IRON", "FOLIC_ACID", "CALCIUM", "THRIPOSHA"]', 'Weight gain adequate. Advised resting and hydration.', '${daysAgo(2)}', '${now}', '${now}'),
      ('d1000005-0000-0000-0000-000000000005', '${SEED_IDS.P1}', '${daysAgo(2)}', 'CLINIC', 28.0, 28.0, 68.9, 116, 75, 11.4, '[]', '["IRON", "FOLIC_ACID", "CALCIUM"]', 'Kick chart initiated. Mother instructed on Cardiff count-to-10.', '${daysFromNow(12)}', '${now}', '${now}'),
      
      ('d1000006-0000-0000-0000-000000000006', '${SEED_IDS.P2}', '${daysAgo(35)}', 'CLINIC', 15.0, 14.5, 70.0, 138, 88, 10.2, '[]', '["IRON", "FOLIC_ACID"]', 'BP slightly elevated. Advised salt restriction.', '${daysAgo(21)}', '${now}', '${now}'),
      ('d1000007-0000-0000-0000-000000000007', '${SEED_IDS.P2}', '${daysAgo(21)}', 'CLINIC', 17.0, 16.5, 72.0, 145, 92, 9.5, '["SEVERE_HEADACHE"]', '["IRON", "FOLIC_ACID"]', 'BP 145/92 and severe headache. Urgent VOG referral given.', '${daysAgo(7)}', '${now}', '${now}'),
      
      ('d1000008-0000-0000-0000-000000000008', '${SEED_IDS.P3}', '${daysAgo(10)}', 'HOME', 14.5, 14.0, 55.0, 110, 70, 10.8, '[]', '["IRON", "FOLIC_ACID", "THRIPOSHA"]', 'Thyroid medication compliance checked.', '${daysFromNow(14)}', '${now}', '${now}'),
      
      ('d1000009-0000-0000-0000-000000000009', '${SEED_IDS.P4}', '${daysAgo(84)}', 'CLINIC', 20.0, 20.0, 68.2, 116, 74, 12.4, '[]', '["IRON", "CALCIUM"]', 'Mid-pregnancy clinic check. SFH matches dates.', '${daysAgo(56)}', '${now}', '${now}'),
      ('d1000010-0000-0000-0000-000000000010', '${SEED_IDS.P4}', '${daysAgo(56)}', 'HOME', 24.0, 24.2, 70.0, 118, 76, 12.1, '[]', '["IRON", "CALCIUM"]', 'Fundal height corresponds to POA.', '${daysAgo(28)}', '${now}', '${now}'),
      ('d1000011-0000-0000-0000-000000000011', '${SEED_IDS.P4}', '${daysAgo(28)}', 'CLINIC', 28.0, 28.0, 72.0, 118, 78, 12.2, '[]', '["IRON", "CALCIUM"]', 'Cardiff count commenced. Kick frequency normal.', '${daysAgo(14)}', '${now}', '${now}'),
      ('d1000012-0000-0000-0000-000000000012', '${SEED_IDS.P4}', '${daysAgo(14)}', 'CLINIC', 30.0, 30.0, 73.5, 118, 78, 12.2, '[]', '["IRON", "CALCIUM"]', 'Normal routine check. Movements good.', '${daysAgo(3)}', '${now}', '${now}'),
      ('d1000013-0000-0000-0000-000000000013', '${SEED_IDS.P4}', '${daysAgo(3)}', 'HOME', 31.5, 31.8, 74.5, 120, 80, 12.0, '[]', '["IRON", "CALCIUM"]', 'Fundal height corresponds to POA. Delivery bag readiness checked.', '${daysFromNow(11)}', '${now}', '${now}'),
      
      ('d1000014-0000-0000-0000-000000000014', '${SEED_IDS.P5}', '${daysAgo(30)}', 'CLINIC', 19.5, 19.0, 80.0, 130, 85, 9.0, '[]', '["IRON", "FOLIC_ACID", "CALCIUM"]', 'High risk diabetes & previous stillbirth. Blood sugar tracking required.', '${daysAgo(7)}', '${now}', '${now}');
  `);

  // 5. Children
  const c1Dob = monthsAgo(2);
  const c2Dob = monthsAgo(10);
  const c3Dob = monthsAgo(24);
  const c4Dob = monthsAgo(36);
  const c5Dob = monthsAgo(2.5);

  await db.execAsync(`
    INSERT INTO children (id, mother_id, pregnancy_id, qr_token, full_name, dob, gender, birth_weight_kg, gestational_age_at_birth_weeks, nutrition_status, growth_faltering_flag, created_at, updated_at)
    VALUES
      ('${SEED_IDS.C1}', '${SEED_IDS.M4}', NULL, 'C-QR-0001', 'Senuri Jayawardena', '${c1Dob}', 'F', 3.2, 39.0, 'NORMAL', 0, '${now}', '${now}'),
      ('${SEED_IDS.C2}', '${SEED_IDS.M6}', NULL, 'C-QR-0002', 'Nethmi Rathnayake', '${c2Dob}', 'F', 2.9, 38.5, 'NORMAL', 0, '${now}', '${now}'),
      ('${SEED_IDS.C3}', '${SEED_IDS.M1}', NULL, 'C-QR-0003', 'Pasindu Perera', '${c3Dob}', 'M', 2.8, 39.0, 'MAM', 1, '${now}', '${now}'),
      ('${SEED_IDS.C4}', '${SEED_IDS.M2}', NULL, 'C-QR-0004', 'Kavindi Silva', '${c4Dob}', 'F', 3.1, 40.0, 'NORMAL', 0, '${now}', '${now}'),
      ('${SEED_IDS.C5}', '${SEED_IDS.M5}', NULL, 'C-QR-0005', 'Tharushi Bandara (Preterm)', '${c5Dob}', 'F', 1.95, 34.0, 'NORMAL', 0, '${now}', '${now}');
  `);

  // 6. Child Growth Records
  await db.execAsync(`
    INSERT INTO child_growth_records (id, child_id, recorded_date, age_months, weight_kg, height_cm, head_circumference_cm, milestones_json, supplements_json, created_at, updated_at)
    VALUES
      ('ca000001-0000-0000-0000-000000000001', '${SEED_IDS.C3}', '${monthsAgo(4)}', 20, 10.5, 82.0, 47.8, '["WALKS", "SAYS_WORDS"]', '["VITAMIN_A"]', '${now}', '${now}'),
      ('ca000002-0000-0000-0000-000000000002', '${SEED_IDS.C3}', '${monthsAgo(3)}', 21, 10.5, 82.5, 48.0, '["WALKS", "SAYS_WORDS"]', '[]', '${now}', '${now}'),
      ('ca000003-0000-0000-0000-000000000003', '${SEED_IDS.C3}', '${monthsAgo(2)}', 22, 10.3, 83.0, 48.2, '["WALKS", "SAYS_SENTENCES"]', '["THRIPOSHA"]', '${now}', '${now}'),
      ('ca000004-0000-0000-0000-000000000004', '${SEED_IDS.C1}', '${monthsAgo(1)}', 1, 4.2, 54.0, 37.0, '["HEAD_CONTROL"]', '[]', '${now}', '${now}'),
      ('ca000005-0000-0000-0000-000000000005', '${SEED_IDS.C2}', '${monthsAgo(1)}', 9, 8.0, 70.0, 44.2, '["SITS", "CRAWLS"]', '["VITAMIN_A"]', '${now}', '${now}'),
      
      -- Preterm infant C5 multi-week growth trajectory (34w birth -> 44w postmenstrual age)
      ('ca000006-0000-0000-0000-000000000006', '${SEED_IDS.C5}', '${daysAgo(70)}', 0, 1.95, 43.0, 30.5, '[]', '[]', '${now}', '${now}'),
      ('ca000007-0000-0000-0000-000000000007', '${SEED_IDS.C5}', '${daysAgo(56)}', 0, 2.25, 45.2, 32.0, '[]', '[]', '${now}', '${now}'),
      ('ca000008-0000-0000-0000-000000000008', '${SEED_IDS.C5}', '${daysAgo(42)}', 1, 2.65, 47.0, 33.5, '["FIXES_GAZE"]', '["VITAMIN_A"]', '${now}', '${now}'),
      ('ca000009-0000-0000-0000-000000000009', '${SEED_IDS.C5}', '${daysAgo(28)}', 1, 3.10, 49.0, 35.0, '["SOCIAL_SMILE"]', '[]', '${now}', '${now}'),
      ('ca000010-0000-0000-0000-000000000010', '${SEED_IDS.C5}', '${daysAgo(14)}', 2, 3.65, 51.5, 36.5, '["HEAD_CONTROL"]', '[]', '${now}', '${now}'),
      ('ca000011-0000-0000-0000-000000000011', '${SEED_IDS.C5}', '${daysAgo(1)}', 2, 4.15, 53.5, 37.8, '["HOLDS_RATTLE"]', '["THRIPOSHA"]', '${now}', '${now}');
  `);

  // Fetal Kick Logs (Cardiff Count-to-10 for P1 and P4)
  await db.execAsync(`
    INSERT INTO fetal_kick_logs (id, pregnancy_id, log_date, start_time, tenth_kick_time, kick_count, duration_minutes, reduced_movement_flag, created_at, updated_at)
    VALUES
      ('fa000001-0000-0000-0000-000000000001', '${SEED_IDS.P1}', '${daysAgo(7)}', '09:00', '11:15', 10, 135, 0, '${now}', '${now}'),
      ('fa000002-0000-0000-0000-000000000002', '${SEED_IDS.P1}', '${daysAgo(6)}', '09:00', '10:50', 10, 110, 0, '${now}', '${now}'),
      ('fa000003-0000-0000-0000-000000000003', '${SEED_IDS.P1}', '${daysAgo(5)}', '09:00', '11:30', 10, 150, 0, '${now}', '${now}'),
      ('fa000004-0000-0000-0000-000000000004', '${SEED_IDS.P1}', '${daysAgo(4)}', '09:00', '10:45', 10, 105, 0, '${now}', '${now}'),
      ('fa000005-0000-0000-0000-000000000005', '${SEED_IDS.P1}', '${daysAgo(3)}', '09:00', '12:15', 10, 195, 0, '${now}', '${now}'),
      ('fa000006-0000-0000-0000-000000000006', '${SEED_IDS.P1}', '${daysAgo(2)}', '09:00', '11:00', 10, 120, 0, '${now}', '${now}'),
      ('fa000007-0000-0000-0000-000000000007', '${SEED_IDS.P1}', '${daysAgo(1)}', '09:00', '11:20', 10, 140, 0, '${now}', '${now}'),
      
      ('fa000008-0000-0000-0000-000000000008', '${SEED_IDS.P4}', '${daysAgo(7)}', '09:00', '10:40', 10, 100, 0, '${now}', '${now}'),
      ('fa000009-0000-0000-0000-000000000009', '${SEED_IDS.P4}', '${daysAgo(6)}', '09:00', '11:10', 10, 130, 0, '${now}', '${now}'),
      ('fa000010-0000-0000-0000-000000000010', '${SEED_IDS.P4}', '${daysAgo(5)}', '09:00', '10:55', 10, 115, 0, '${now}', '${now}'),
      ('fa000011-0000-0000-0000-000000000011', '${SEED_IDS.P4}', '${daysAgo(4)}', '09:00', '11:25', 10, 145, 0, '${now}', '${now}'),
      ('fa000012-0000-0000-0000-000000000012', '${SEED_IDS.P4}', '${daysAgo(3)}', '09:00', '12:00', 10, 180, 0, '${now}', '${now}'),
      ('fa000013-0000-0000-0000-000000000013', '${SEED_IDS.P4}', '${daysAgo(2)}', '09:00', '21:30', 7, 750, 1, '${now}', '${now}'),
      ('fa000014-0000-0000-0000-000000000014', '${SEED_IDS.P4}', '${daysAgo(1)}', '09:00', '11:10', 10, 130, 0, '${now}', '${now}');
  `);

  // Postnatal MEOWS (Postnatal check-ups for P4)
  await db.execAsync(`
    INSERT INTO postnatal_meows (id, pregnancy_id, recorded_at, days_postpartum, bp_systolic, bp_diastolic, pulse_bpm, resp_rate, temp_c, lochia_bleeding, alert_level, action_advice, created_at, updated_at)
    VALUES
      ('fb000001-0000-0000-0000-000000000001', '${SEED_IDS.P4}', '${daysAgo(14)} 10:00:00', 1, 118, 76, 76, 16, 36.8, 'NORMAL', 'WHITE', 'Vitals normal. Routine postpartum observation.', '${now}', '${now}'),
      ('fb000002-0000-0000-0000-000000000002', '${SEED_IDS.P4}', '${daysAgo(12)} 11:30:00', 3, 122, 80, 80, 17, 37.0, 'NORMAL', 'WHITE', 'Normal recovery. Advised on exclusive breastfeeding.', '${now}', '${now}'),
      ('fb000003-0000-0000-0000-000000000003', '${SEED_IDS.P4}', '${daysAgo(10)} 09:15:00', 5, 138, 88, 94, 20, 37.4, 'NORMAL', 'YELLOW', 'Single yellow trigger: Borderline BP & tachycardia. Recheck in 2 hours.', '${now}', '${now}'),
      ('fb000004-0000-0000-0000-000000000004', '${SEED_IDS.P4}', '${daysAgo(8)} 14:00:00', 7, 120, 78, 78, 16, 36.7, 'NORMAL', 'WHITE', 'Vitals stabilized. Episiotomy site healing well.', '${now}', '${now}');
  `);

  // 7. Immunizations (Generate complete schedule for all children)
  const childrenList = [
    { id: SEED_IDS.C1, dob: new Date(c1Dob) },
    { id: SEED_IDS.C2, dob: new Date(c2Dob) },
    { id: SEED_IDS.C3, dob: new Date(c3Dob) },
    { id: SEED_IDS.C4, dob: new Date(c4Dob) },
    { id: SEED_IDS.C5, dob: new Date(c5Dob) },
  ];

  const todayDate = new Date();

  for (const child of childrenList) {
    const schedule = generateEPISchedule(child.dob);

    for (let i = 0; i < schedule.length; i++) {
      const v = schedule[i];
      const isPast = v.scheduledDate < todayDate;

      let status: 'PENDING' | 'GIVEN' | 'OVERDUE' = 'PENDING';
      let givenDate: string | null = null;

      if (child.id === SEED_IDS.C1 || child.id === SEED_IDS.C5) {
        // ~2 months old: BCG given at birth; Penta1/OPV1/fIPV1 due now
        if (v.vaccineCode === 'BCG') {
          status = 'GIVEN';
          givenDate = child.dob.toISOString().split('T')[0];
        } else if (isPast) {
          status = 'OVERDUE';
        }
      } else if (child.id === SEED_IDS.C2) {
        // 10 months old: BCG, Penta1-3, OPV1-3, fIPV1-2, MMR1 given
        const givenCodes = ['BCG', 'PENTA1', 'OPV1', 'FIPV1', 'PENTA2', 'OPV2', 'FIPV2', 'PENTA3', 'OPV3', 'MMR1'];
        if (givenCodes.includes(v.vaccineCode)) {
          status = 'GIVEN';
          givenDate = v.scheduledDate.toISOString().split('T')[0];
        } else if (isPast) {
          status = 'OVERDUE';
        }
      } else if (child.id === SEED_IDS.C3) {
        // 24 months old: up to 18 months vaccines given
        const givenCodes = ['BCG', 'PENTA1', 'OPV1', 'FIPV1', 'PENTA2', 'OPV2', 'FIPV2', 'PENTA3', 'OPV3', 'MMR1', 'LIVE_JE', 'DTP4', 'OPV4'];
        if (givenCodes.includes(v.vaccineCode)) {
          status = 'GIVEN';
          givenDate = v.scheduledDate.toISOString().split('T')[0];
        } else if (isPast) {
          status = 'OVERDUE';
        }
      } else if (child.id === SEED_IDS.C4) {
        // 36 months old: up to 18mo given; MMR 2 (at 36mo) is OVERDUE!
        const givenCodes = ['BCG', 'PENTA1', 'OPV1', 'FIPV1', 'PENTA2', 'OPV2', 'FIPV2', 'PENTA3', 'OPV3', 'MMR1', 'LIVE_JE', 'DTP4', 'OPV4'];
        if (givenCodes.includes(v.vaccineCode)) {
          status = 'GIVEN';
          givenDate = v.scheduledDate.toISOString().split('T')[0];
        } else if (isPast) {
          status = 'OVERDUE';
        }
      }

      const immId = `cb${String(i).padStart(6, '0')}-0000-4000-8000-${child.id.substring(24)}`;
      const scheduledStr = v.scheduledDate.toISOString().split('T')[0];

      await db.runAsync(
        `INSERT INTO immunizations (id, child_id, vaccine_code, vaccine_name, scheduled_date, given_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [immId, child.id, v.vaccineCode, v.vaccineName, scheduledStr, givenDate, status, now, now]
      );
    }
  }

  // 8. Tasks (Overdue alerts, High-risk visits, today's schedule)
  await db.execAsync(`
    INSERT INTO tasks (id, target_type, target_id, task_type, priority, due_date, status, notes, created_at, updated_at)
    VALUES
      ('ea000001-0000-0000-0000-000000000001', 'MOTHER', '${SEED_IDS.M2}', 'HOME_VISIT', 'URGENT', '${daysAgo(7)}', 'OVERDUE', 'High BP (145/92) & headache at last visit. Needs urgent home visit.', '${now}', '${now}'),
      ('ea000002-0000-0000-0000-000000000002', 'MOTHER', '${SEED_IDS.M5}', 'VOG_REFERRAL', 'URGENT', '${daysAgo(3)}', 'OVERDUE', 'High-risk mother (Diabetes + Cardiac). Confirm VOG hospital review.', '${now}', '${now}'),
      ('ea000003-0000-0000-0000-000000000003', 'MOTHER', '${SEED_IDS.M5}', 'HOME_VISIT', 'HIGH', '${daysAgo(7)}', 'OVERDUE', 'Overdue antenatal home visit. Check blood sugar records.', '${now}', '${now}'),
      ('ea000004-0000-0000-0000-000000000004', 'MOTHER', '${SEED_IDS.M1}', 'HOME_VISIT', 'HIGH', '${daysFromNow(0)}', 'OPEN', 'Scheduled home visit: Fertility-treatment precious pregnancy follow-up.', '${now}', '${now}'),
      ('ea000005-0000-0000-0000-000000000005', 'MOTHER', '${SEED_IDS.M4}', 'CLINIC_DUE', 'NORMAL', '${daysFromNow(1)}', 'OPEN', 'Routine clinic visit at Kottawa MOH clinic.', '${now}', '${now}'),
      ('ea000006-0000-0000-0000-000000000006', 'CHILD', '${SEED_IDS.C1}', 'VACCINE_DUE', 'HIGH', '${daysFromNow(0)}', 'OPEN', 'Due for Pentavalent 1, OPV 1, fIPV 1 at clinic today.', '${now}', '${now}'),
      ('ea000007-0000-0000-0000-000000000007', 'CHILD', '${SEED_IDS.C3}', 'HOME_VISIT', 'URGENT', '${daysAgo(5)}', 'OVERDUE', 'Growth faltering alert: Weight dropping (MAM). Check Thriposha intake.', '${now}', '${now}'),
      ('ea000008-0000-0000-0000-000000000008', 'CHILD', '${SEED_IDS.C4}', 'VACCINE_DUE', 'HIGH', '${daysAgo(10)}', 'OVERDUE', 'MMR 2 vaccine overdue at 3 years.', '${now}', '${now}');
  `);

  // 9. Schedule Templates
  await seedScheduleTemplatesIfEmpty(db);
}

export async function seedScheduleTemplatesIfEmpty(dbInstance?: SQLiteDatabase): Promise<void> {
  const db = dbInstance || (await getDatabase());
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM schedule_templates WHERE deleted_at IS NULL'
  );

  if (countRow && countRow.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  await db.execAsync(`
    INSERT INTO schedule_templates (id, day_of_week, week_pattern, activity_type, gn_division, title, start_time, end_time, created_at, updated_at)
    VALUES
      ('da000001-0000-0000-0000-000000000001', 1, '1_3', 'ANC_CLINIC', NULL, 'Antenatal Care Clinic (පූර්ව ප්‍රසව සායනය)', '08:30', '13:00', '${now}', '${now}'),
      ('da000002-0000-0000-0000-000000000002', 1, '2_4', 'HOME_VISIT', 'Kottawa North', 'Home Visits: Kottawa North (ගෘහ චාරිකා)', '08:30', '16:00', '${now}', '${now}'),
      ('da000003-0000-0000-0000-000000000003', 2, 'ALL', 'HOME_VISIT', 'Kottawa South', 'Home Visits: Kottawa South (ගෘහ චාරිකා)', '08:30', '16:00', '${now}', '${now}'),
      ('da000004-0000-0000-0000-000000000004', 3, 'ALL', 'CWC_CLINIC', NULL, 'Child Welfare & Immunization Clinic (ළමා සායනය)', '08:30', '13:30', '${now}', '${now}'),
      ('da000005-0000-0000-0000-000000000005', 4, 'ALL', 'HOME_VISIT', 'Maharagama East', 'Home Visits: Maharagama East (ගෘහ චාරිකා)', '08:30', '16:00', '${now}', '${now}'),
      ('da000006-0000-0000-0000-000000000006', 5, 'ALL', 'MOH_OFFICE', NULL, 'MOH Office Conference & H509 Review (කාර්යාල දිනය)', '08:30', '16:00', '${now}', '${now}'),
      ('da000007-0000-0000-0000-000000000007', 6, 'ALL', 'CATCH_UP', NULL, 'Overdue Follow-ups & Catch-Up Field Visits (මගහැරුණු චාරිකා)', '08:30', '12:30', '${now}', '${now}'),
      ('da000008-0000-0000-0000-000000000008', 0, 'ALL', 'OFF', NULL, 'Weekly Rest Day (විවේක දිනය)', '08:30', '16:00', '${now}', '${now}');
  `);
}
