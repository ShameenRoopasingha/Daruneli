"""
Seed script to populate Supabase PostgreSQL with the realistic Sri Lankan PHM dataset.
Includes 6 families, 6 mothers across RED/YELLOW/GREEN risk tiers, pregnancies,
antenatal visits, 4 children, growth records, immunizations, and tasks.
All UUIDs strictly follow hex RFC 4122 format so PostgreSQL accepts them.
"""
import psycopg2
from datetime import datetime, timezone, timedelta

DB_URL = "postgresql://postgres.raquytvklpnlxfxqsiwz:199824900278Dsr@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
PHM_AREA_ID = "a0000001-0000-0000-0000-000000000001"

now = datetime.now(timezone.utc).isoformat()

def days_ago(d):
    return (datetime.now(timezone.utc) - timedelta(days=d)).date().isoformat()

def days_from_now(d):
    return (datetime.now(timezone.utc) + timedelta(days=d)).date().isoformat()

def months_ago(m):
    return (datetime.now(timezone.utc) - timedelta(days=m * 30)).date().isoformat()

SEED_IDS = {
    "F1": "f0000001-0000-0000-0000-000000000001",
    "F2": "f0000002-0000-0000-0000-000000000002",
    "F3": "f0000003-0000-0000-0000-000000000003",
    "F4": "f0000004-0000-0000-0000-000000000004",
    "F5": "f0000005-0000-0000-0000-000000000005",
    "F6": "f0000006-0000-0000-0000-000000000006",

    "M1": "a1000001-0000-0000-0000-000000000001",
    "M2": "a1000002-0000-0000-0000-000000000002",
    "M3": "a1000003-0000-0000-0000-000000000003",
    "M4": "a1000004-0000-0000-0000-000000000004",
    "M5": "a1000005-0000-0000-0000-000000000005",
    "M6": "a1000006-0000-0000-0000-000000000006",

    "P1": "b2000001-0000-0000-0000-000000000001",
    "P2": "b2000002-0000-0000-0000-000000000002",
    "P3": "b2000003-0000-0000-0000-000000000003",
    "P4": "b2000004-0000-0000-0000-000000000004",
    "P5": "b2000005-0000-0000-0000-000000000005",
    "P6": "b2000006-0000-0000-0000-000000000006",

    "C1": "c0000001-0000-0000-0000-000000000001",
    "C2": "c0000002-0000-0000-0000-000000000002",
    "C3": "c0000003-0000-0000-0000-000000000003",
    "C4": "c0000004-0000-0000-0000-000000000004",
}

def seed():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    print("Connected to Supabase PostgreSQL...")

    # 1. Families
    cur.execute("""
        INSERT INTO families (id, phm_area_id, eligible_family_no, gn_division, address, husband_name, emergency_phone, residency_status)
        VALUES 
            (%(F1)s, %(area)s, 'EF/KOT/001', 'Kottawa North', '42, Temple Road, Kottawa', 'Ruwan Perera', '0771234561', 'ACTIVE'),
            (%(F2)s, %(area)s, 'EF/KOT/002', 'Kottawa South', '15, Galle Road, Kottawa', 'Kasun Silva', '0772345672', 'ACTIVE'),
            (%(F3)s, %(area)s, 'EF/KOT/003', 'Kottawa North', '88, Lake View, Kottawa', 'Nuwan Fernando', '0773456783', 'ACTIVE'),
            (%(F4)s, %(area)s, 'EF/MAH/001', 'Maharagama East', '23, Station Road, Maharagama', 'Dinesh Jayawardena', '0774567894', 'ACTIVE'),
            (%(F5)s, %(area)s, 'EF/MAH/002', 'Maharagama West', '7, Hospital Lane, Maharagama', 'Pradeep Bandara', '0775678905', 'ACTIVE'),
            (%(F6)s, %(area)s, 'EF/KOT/004', 'Kottawa South', '55, New Road, Kottawa', 'Chaminda Rathnayake', '0776789016', 'ACTIVE')
        ON CONFLICT (id) DO UPDATE SET
            phm_area_id = EXCLUDED.phm_area_id,
            eligible_family_no = EXCLUDED.eligible_family_no,
            gn_division = EXCLUDED.gn_division,
            address = EXCLUDED.address,
            husband_name = EXCLUDED.husband_name,
            emergency_phone = EXCLUDED.emergency_phone,
            residency_status = EXCLUDED.residency_status;
    """, {"area": PHM_AREA_ID, **SEED_IDS})
    print("Families seeded.")

    # 2. Mothers
    cur.execute("""
        INSERT INTO mothers (id, phm_area_id, family_id, qr_token, full_name, nic, dob, phone, blood_group, chronic_conditions_json, fertility_treatment_history, prev_miscarriages_count, prev_stillbirths_count, prev_c_sections_count, planning_pregnancy)
        VALUES
            (%(M1)s, %(area)s, %(F1)s, 'M-QR-0001', 'Nimali Perera', '887654321V', '1989-03-15', '0771122334', 'A+', '[]'::jsonb, 1, 0, 0, 0, 0),
            (%(M2)s, %(area)s, %(F2)s, 'M-QR-0002', 'Kamala Silva', '917654321V', '1991-07-22', '0772233445', 'B+', '["HYPERTENSION"]'::jsonb, 0, 3, 0, 0, 0),
            (%(M3)s, %(area)s, %(F3)s, 'M-QR-0003', 'Sachini Fernando', '200712345V', '2007-01-10', '0773344556', 'O+', '["THYROID"]'::jsonb, 0, 1, 0, 0, 0),
            (%(M4)s, %(area)s, %(F4)s, 'M-QR-0004', 'Dilini Jayawardena', '957654321V', '1995-11-28', '0774455667', 'AB+', '[]'::jsonb, 0, 0, 0, 0, 0),
            (%(M5)s, %(area)s, %(F5)s, 'M-QR-0005', 'Iresha Bandara', '887654322V', '1988-09-05', '0775566778', 'A-', '["DIABETES","HEART_DISEASE"]'::jsonb, 0, 0, 1, 0, 0),
            (%(M6)s, %(area)s, %(F6)s, 'M-QR-0006', 'Thilini Rathnayake', '1991765432', '1991-06-18', '0776677889', 'B-', '["PCOS"]'::jsonb, 0, 0, 0, 1, 0)
        ON CONFLICT (id) DO UPDATE SET
            phm_area_id = EXCLUDED.phm_area_id,
            family_id = EXCLUDED.family_id,
            qr_token = EXCLUDED.qr_token,
            full_name = EXCLUDED.full_name,
            nic = EXCLUDED.nic,
            phone = EXCLUDED.phone,
            blood_group = EXCLUDED.blood_group,
            chronic_conditions_json = EXCLUDED.chronic_conditions_json,
            fertility_treatment_history = EXCLUDED.fertility_treatment_history,
            prev_miscarriages_count = EXCLUDED.prev_miscarriages_count,
            prev_stillbirths_count = EXCLUDED.prev_stillbirths_count,
            prev_c_sections_count = EXCLUDED.prev_c_sections_count,
            planning_pregnancy = EXCLUDED.planning_pregnancy;
    """, {"area": PHM_AREA_ID, **SEED_IDS})
    print("Mothers seeded.")

    # 3. Pregnancies
    cur.execute("""
        INSERT INTO pregnancies (id, phm_area_id, mother_id, gravida, para, lrmp_date, edd_date, is_precious_pregnancy, risk_level, risk_score, risk_factors_json, status)
        VALUES
            (%(P1)s, %(area)s, %(M1)s, 1, 0, %(p1Lrmp)s, %(p1Edd)s, 1, 'RED', 16, '["Fertility treatment pregnancy", "Precious pregnancy"]'::jsonb, 'ACTIVE'),
            (%(P2)s, %(area)s, %(M2)s, 4, 0, %(p2Lrmp)s, %(p2Edd)s, 0, 'RED', 17, '["Recurrent miscarriages (3)", "Chronic condition: HYPERTENSION"]'::jsonb, 'ACTIVE'),
            (%(P3)s, %(area)s, %(M3)s, 2, 0, %(p3Lrmp)s, %(p3Edd)s, 0, 'YELLOW', 11, '["Young maternal age (19)", "Previous miscarriage (1)", "Condition: THYROID"]'::jsonb, 'ACTIVE'),
            (%(P4)s, %(area)s, %(M4)s, 2, 1, %(p4Lrmp)s, %(p4Edd)s, 0, 'GREEN', 0, '[]'::jsonb, 'ACTIVE'),
            (%(P5)s, %(area)s, %(M5)s, 3, 1, %(p5Lrmp)s, %(p5Edd)s, 0, 'RED', 20, '["Previous stillbirth (1)", "Chronic condition: DIABETES", "Chronic condition: HEART_DISEASE"]'::jsonb, 'ACTIVE'),
            (%(P6)s, %(area)s, %(M6)s, 2, 1, %(p6Lrmp)s, %(p6Edd)s, 0, 'YELLOW', 10, '["Advanced maternal age (35)", "Previous C-section (1)", "Condition: PCOS"]'::jsonb, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE SET
            phm_area_id = EXCLUDED.phm_area_id,
            gravida = EXCLUDED.gravida,
            para = EXCLUDED.para,
            lrmp_date = EXCLUDED.lrmp_date,
            edd_date = EXCLUDED.edd_date,
            is_precious_pregnancy = EXCLUDED.is_precious_pregnancy,
            risk_level = EXCLUDED.risk_level,
            risk_score = EXCLUDED.risk_score,
            risk_factors_json = EXCLUDED.risk_factors_json,
            status = EXCLUDED.status;
    """, {
        "area": PHM_AREA_ID,
        **SEED_IDS,
        "p1Lrmp": days_ago(28 * 7),
        "p1Edd": days_from_now(12 * 7),
        "p2Lrmp": days_ago(20 * 7),
        "p2Edd": days_from_now(20 * 7),
        "p3Lrmp": days_ago(16 * 7),
        "p3Edd": days_from_now(24 * 7),
        "p4Lrmp": days_ago(32 * 7),
        "p4Edd": days_from_now(8 * 7),
        "p5Lrmp": days_ago(24 * 7),
        "p5Edd": days_from_now(16 * 7),
        "p6Lrmp": days_ago(12 * 7),
        "p6Edd": days_from_now(28 * 7),
    })
    print("Pregnancies seeded.")

    # 4. Antenatal Visits
    visits = [
        ("d1000001-0000-0000-0000-000000000001", SEED_IDS["P1"], days_ago(28), "CLINIC", 24.0, 66.5, 115, 75, 11.5, "[]", '["IRON", "FOLIC_ACID", "CALCIUM"]', "Precious pregnancy monitoring. Fetal heart sounds audible and clear.", days_ago(14)),
        ("d1000002-0000-0000-0000-000000000002", SEED_IDS["P1"], days_ago(14), "HOME", 26.0, 67.8, 118, 76, 11.2, "[]", '["IRON", "FOLIC_ACID", "CALCIUM", "THRIPOSHA"]', "Weight gain adequate. Advised resting and hydration.", days_from_now(7)),
        ("d1000003-0000-0000-0000-000000000003", SEED_IDS["P2"], days_ago(35), "CLINIC", 15.0, 70.0, 138, 88, 10.2, "[]", '["IRON", "FOLIC_ACID"]', "BP slightly elevated. Advised salt restriction.", days_ago(21)),
        ("d1000004-0000-0000-0000-000000000004", SEED_IDS["P2"], days_ago(21), "CLINIC", 17.0, 72.0, 145, 92, 9.5, '["SEVERE_HEADACHE"]', '["IRON", "FOLIC_ACID"]', "BP 145/92 and severe headache. Urgent VOG referral given.", days_ago(7)),
        ("d1000005-0000-0000-0000-000000000005", SEED_IDS["P3"], days_ago(10), "HOME", 14.5, 55.0, 110, 70, 10.8, "[]", '["IRON", "FOLIC_ACID", "THRIPOSHA"]', "Thyroid medication compliance checked.", days_from_now(14)),
        ("d1000006-0000-0000-0000-000000000006", SEED_IDS["P4"], days_ago(14), "CLINIC", 30.0, 73.5, 118, 78, 12.2, "[]", '["IRON", "CALCIUM"]', "Normal routine check. Movements good.", days_from_now(14)),
        ("d1000007-0000-0000-0000-000000000007", SEED_IDS["P4"], days_ago(3), "HOME", 31.5, 74.5, 120, 80, 12.0, "[]", '["IRON", "CALCIUM"]', "Fundal height corresponds to POA. Delivery bag readiness checked.", days_from_now(11)),
        ("d1000008-0000-0000-0000-000000000008", SEED_IDS["P5"], days_ago(30), "CLINIC", 19.5, 80.0, 130, 85, 9.0, "[]", '["IRON", "FOLIC_ACID", "CALCIUM"]', "High risk diabetes & previous stillbirth. Blood sugar tracking required.", days_ago(7)),
    ]
    for v in visits:
        cur.execute("""
            INSERT INTO antenatal_visits (id, phm_area_id, pregnancy_id, visit_date, visit_type, poa_weeks, weight_kg, bp_systolic, bp_diastolic, hemoglobin, danger_signs_json, supplements_json, notes, next_visit_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                phm_area_id = EXCLUDED.phm_area_id,
                pregnancy_id = EXCLUDED.pregnancy_id,
                visit_date = EXCLUDED.visit_date,
                visit_type = EXCLUDED.visit_type,
                poa_weeks = EXCLUDED.poa_weeks,
                weight_kg = EXCLUDED.weight_kg,
                bp_systolic = EXCLUDED.bp_systolic,
                bp_diastolic = EXCLUDED.bp_diastolic,
                hemoglobin = EXCLUDED.hemoglobin,
                danger_signs_json = EXCLUDED.danger_signs_json,
                supplements_json = EXCLUDED.supplements_json,
                notes = EXCLUDED.notes,
                next_visit_date = EXCLUDED.next_visit_date;
        """, (v[0], PHM_AREA_ID, v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], v[12]))
    print("Antenatal visits seeded.")

    # 5. Children
    c1_dob = months_ago(2)
    c2_dob = months_ago(10)
    c3_dob = months_ago(24)
    c4_dob = months_ago(36)
    children = [
        (SEED_IDS["C1"], SEED_IDS["M4"], None, 'C-QR-0001', 'Senuri Jayawardena', c1_dob, 'F', 3.2, 'NORMAL', 0),
        (SEED_IDS["C2"], SEED_IDS["M6"], None, 'C-QR-0002', 'Nethmi Rathnayake', c2_dob, 'F', 2.9, 'NORMAL', 0),
        (SEED_IDS["C3"], SEED_IDS["M1"], None, 'C-QR-0003', 'Pasindu Perera', c3_dob, 'M', 2.8, 'MAM', 1),
        (SEED_IDS["C4"], SEED_IDS["M2"], None, 'C-QR-0004', 'Kavindi Silva', c4_dob, 'F', 3.1, 'NORMAL', 0),
    ]
    for c in children:
        cur.execute("""
            INSERT INTO children (id, phm_area_id, mother_id, pregnancy_id, qr_token, full_name, dob, gender, birth_weight_kg, nutrition_status, growth_faltering_flag)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                phm_area_id = EXCLUDED.phm_area_id,
                mother_id = EXCLUDED.mother_id,
                pregnancy_id = EXCLUDED.pregnancy_id,
                qr_token = EXCLUDED.qr_token,
                full_name = EXCLUDED.full_name,
                dob = EXCLUDED.dob,
                gender = EXCLUDED.gender,
                birth_weight_kg = EXCLUDED.birth_weight_kg,
                nutrition_status = EXCLUDED.nutrition_status,
                growth_faltering_flag = EXCLUDED.growth_faltering_flag;
        """, (c[0], PHM_AREA_ID, c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9]))
    print("Children seeded.")

    # 6. Child Growth Records
    growth_records = [
        ("ca000001-0000-0000-0000-000000000001", SEED_IDS["C3"], months_ago(4), 20, 10.5, 82.0, '["WALKS", "SAYS_WORDS"]', '["VITAMIN_A"]'),
        ("ca000002-0000-0000-0000-000000000002", SEED_IDS["C3"], months_ago(3), 21, 10.5, 82.5, '["WALKS", "SAYS_WORDS"]', '[]'),
        ("ca000003-0000-0000-0000-000000000003", SEED_IDS["C3"], months_ago(2), 22, 10.3, 83.0, '["WALKS", "SAYS_SENTENCES"]', '["THRIPOSHA"]'),
        ("ca000004-0000-0000-0000-000000000004", SEED_IDS["C1"], months_ago(1), 1, 4.2, 54.0, '["HEAD_CONTROL"]', '[]'),
        ("ca000005-0000-0000-0000-000000000005", SEED_IDS["C2"], months_ago(1), 9, 8.0, 70.0, '["SITS", "CRAWLS"]', '["VITAMIN_A"]'),
    ]
    for gr in growth_records:
        cur.execute("""
            INSERT INTO child_growth_records (id, phm_area_id, child_id, recorded_date, age_months, weight_kg, height_cm, milestones_json, supplements_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                phm_area_id = EXCLUDED.phm_area_id,
                child_id = EXCLUDED.child_id,
                recorded_date = EXCLUDED.recorded_date,
                age_months = EXCLUDED.age_months,
                weight_kg = EXCLUDED.weight_kg,
                height_cm = EXCLUDED.height_cm,
                milestones_json = EXCLUDED.milestones_json,
                supplements_json = EXCLUDED.supplements_json;
        """, (gr[0], PHM_AREA_ID, gr[1], gr[2], gr[3], gr[4], gr[5], gr[6], gr[7]))
    print("Growth records seeded.")

    # 7. Immunizations (Generate for all 4 children)
    epi_schedule = [
        ('BCG', 'BCG', 0),
        ('PENTA1', 'Pentavalent 1', 2),
        ('OPV1', 'OPV 1', 2),
        ('FIPV1', 'fIPV 1', 2),
        ('PENTA2', 'Pentavalent 2', 4),
        ('OPV2', 'OPV 2', 4),
        ('FIPV2', 'fIPV 2', 4),
        ('PENTA3', 'Pentavalent 3', 6),
        ('OPV3', 'OPV 3', 6),
        ('MMR1', 'MMR 1', 9),
        ('LIVE_JE', 'Live JE', 12),
        ('DTP4', 'DTP 4', 18),
        ('OPV4', 'OPV 4', 18),
        ('MMR2', 'MMR 2', 36),
        ('DT', 'DT', 60),
        ('OPV5', 'OPV 5', 60),
    ]
    children_info = [
        (SEED_IDS["C1"], 2),
        (SEED_IDS["C2"], 10),
        (SEED_IDS["C3"], 24),
        (SEED_IDS["C4"], 36),
    ]
    for child_id, age_mo in children_info:
        for idx, (code, name, months_offset) in enumerate(epi_schedule):
            imm_id = f"cb{str(idx).zfill(6)}-0000-4000-8000-{child_id[24:]}"
            sched_date = months_ago(age_mo - months_offset)
            status = 'PENDING'
            given_date = None
            if months_offset < age_mo:
                status = 'GIVEN'
                given_date = sched_date
            elif months_offset == age_mo:
                status = 'OVERDUE'
            
            cur.execute("""
                INSERT INTO immunizations (id, phm_area_id, child_id, vaccine_code, vaccine_name, scheduled_date, given_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    phm_area_id = EXCLUDED.phm_area_id,
                    child_id = EXCLUDED.child_id,
                    vaccine_code = EXCLUDED.vaccine_code,
                    vaccine_name = EXCLUDED.vaccine_name,
                    scheduled_date = EXCLUDED.scheduled_date,
                    given_date = EXCLUDED.given_date,
                    status = EXCLUDED.status;
            """, (imm_id, PHM_AREA_ID, child_id, code, name, sched_date, given_date, status))
    print("Immunizations seeded.")

    # 8. Tasks
    tasks = [
        ('ea000001-0000-0000-0000-000000000001', 'MOTHER', SEED_IDS["M2"], 'HOME_VISIT', 'URGENT', days_ago(7), 'OVERDUE', 'High BP (145/92) & headache at last visit. Needs urgent home visit.'),
        ('ea000002-0000-0000-0000-000000000002', 'MOTHER', SEED_IDS["M5"], 'VOG_REFERRAL', 'URGENT', days_ago(3), 'OVERDUE', 'High-risk mother (Diabetes + Cardiac). Confirm VOG hospital review.'),
        ('ea000003-0000-0000-0000-000000000003', 'MOTHER', SEED_IDS["M5"], 'HOME_VISIT', 'HIGH', days_ago(7), 'OVERDUE', 'Overdue antenatal home visit. Check blood sugar records.'),
        ('ea000004-0000-0000-0000-000000000004', 'MOTHER', SEED_IDS["M1"], 'HOME_VISIT', 'HIGH', days_from_now(0), 'OPEN', 'Scheduled home visit: Fertility-treatment precious pregnancy follow-up.'),
        ('ea000005-0000-0000-0000-000000000005', 'MOTHER', SEED_IDS["M4"], 'CLINIC_DUE', 'NORMAL', days_from_now(1), 'OPEN', 'Routine clinic visit at Kottawa MOH clinic.'),
        ('ea000006-0000-0000-0000-000000000006', 'CHILD', SEED_IDS["C1"], 'VACCINE_DUE', 'HIGH', days_from_now(0), 'OPEN', 'Due for Pentavalent 1, OPV 1, fIPV 1 at clinic today.'),
        ('ea000007-0000-0000-0000-000000000007', 'CHILD', SEED_IDS["C3"], 'HOME_VISIT', 'URGENT', days_ago(5), 'OVERDUE', 'Growth faltering alert: Weight dropping (MAM). Check Thriposha intake.'),
        ('ea000008-0000-0000-0000-000000000008', 'CHILD', SEED_IDS["C4"], 'VACCINE_DUE', 'HIGH', days_ago(10), 'OVERDUE', 'MMR 2 vaccine overdue at 3 years.'),
    ]
    for t in tasks:
        cur.execute("""
            INSERT INTO tasks (id, phm_area_id, target_type, target_id, task_type, priority, due_date, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                phm_area_id = EXCLUDED.phm_area_id,
                target_type = EXCLUDED.target_type,
                target_id = EXCLUDED.target_id,
                task_type = EXCLUDED.task_type,
                priority = EXCLUDED.priority,
                due_date = EXCLUDED.due_date,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes;
        """, (t[0], PHM_AREA_ID, t[1], t[2], t[3], t[4], t[5], t[6], t[7]))
    print("Tasks seeded.")

    conn.commit()
    conn.close()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed()
