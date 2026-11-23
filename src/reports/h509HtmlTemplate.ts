import type { H509ReportData } from './h509Aggregator';
import { DARUNELI_ICON_BASE64 } from './logoBase64';
import { SRI_LANKA_EMBLEM_DATA_URI } from './emblemBase64';

export function renderH509Html(data: H509ReportData): string {
  const { metadata, section1_antenatal, section2_deliveries, section3_childHealth, section4_immunizations, section5_priorityFollowUp } = data;

  const totalPregnancies =
    section1_antenatal.riskBreakdown.red +
    section1_antenatal.riskBreakdown.yellow +
    section1_antenatal.riskBreakdown.green || 1;

  const redPct = Math.round((section1_antenatal.riskBreakdown.red / totalPregnancies) * 100);
  const yellowPct = Math.round((section1_antenatal.riskBreakdown.yellow / totalPregnancies) * 100);
  const greenPct = Math.round((section1_antenatal.riskBreakdown.green / totalPregnancies) * 100);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MOH Form H509 - ${metadata.reportingPeriod}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #111827;
      margin: 0;
      padding: 0;
      background: #FFFFFF;
    }
    .header-block {
      text-align: center;
      border-bottom: 2px solid #1E3A8A;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .crest {
      font-size: 20pt;
      margin-bottom: 2px;
    }
    .gov-title {
      font-size: 13pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1E3A8A;
      margin: 0;
    }
    .sub-title {
      font-size: 10pt;
      font-weight: 600;
      color: #4B5563;
      margin: 2px 0;
    }
    .form-title {
      font-size: 12pt;
      font-weight: 900;
      color: #991B1B;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 4px;
    }
    .meta-grid {
      display: table;
      width: 100%;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 12px;
      font-size: 9.5pt;
    }
    .meta-row {
      display: table-row;
    }
    .meta-cell {
      display: table-cell;
      padding: 2px 8px;
    }
    .meta-label {
      font-weight: 700;
      color: #475569;
    }
    .meta-val {
      font-weight: 800;
      color: #0F172A;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #1E3A8A;
      background: #EFF6FF;
      border-left: 4px solid #1D4ED8;
      padding: 4px 8px;
      margin-top: 10px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #CBD5E1;
      padding: 4px 8px;
      text-align: left;
    }
    table.data-table th {
      background: #F1F5F9;
      color: #1E293B;
      font-weight: 800;
      font-size: 9pt;
      text-transform: uppercase;
    }
    table.data-table tr:nth-child(even) td {
      background: #F8FAFC;
    }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .num { font-weight: 800; }
    .risk-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 8pt;
    }
    .badge-red { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
    .badge-yellow { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
    .badge-green { background: #DCFCE7; color: #166534; border: 1px solid #86EFAC; }
    .page-break {
      page-break-before: always;
    }
    .signatures-block {
      margin-top: 24px;
      display: table;
      width: 100%;
      page-break-inside: avoid;
      font-size: 9pt;
    }
    .sig-row {
      display: table-row;
    }
    .sig-cell {
      display: table-cell;
      width: 33.33%;
      padding: 0 10px;
      text-align: center;
      vertical-align: bottom;
    }
    .sig-line {
      border-top: 1px dashed #64748B;
      margin-top: 36px;
      padding-top: 4px;
      font-weight: 700;
      color: #334155;
    }
    .sig-role {
      font-size: 8pt;
      color: #64748B;
    }
    .watermark {
      font-size: 8pt;
      color: #94A3B8;
      text-align: right;
      margin-top: 12px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-block">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr>
        <td style="width: 44px; vertical-align: middle; text-align: left;">
          <img src="${DARUNELI_ICON_BASE64}" width="40" height="40" style="border-radius: 8px; display: block;" alt="Daruneli" />
        </td>
        <td style="vertical-align: middle; text-align: left; padding-left: 10px;">
          <div style="font-size: 11pt; font-weight: 900; color: #0F766E; letter-spacing: 0.6px;">DARUNELI — MATERNAL &amp; CHILD HEALTH SYSTEM</div>
          <div style="font-size: 8.5pt; font-weight: 600; color: #64748B;">National Digital Health Platform for Public Health Midwives (PHM)</div>
        </td>
        <td style="vertical-align: middle; text-align: right; width: 60px;">
          <img src="${SRI_LANKA_EMBLEM_DATA_URI}" width="34" height="48" style="display: inline-block; vertical-align: middle;" alt="State Emblem of Sri Lanka" />
        </td>
      </tr>
    </table>
    <div class="gov-title">Ministry of Health • Family Health Bureau • Sri Lanka</div>
    <div class="sub-title">මහජන සෞඛ්‍ය මෙහෙවරිය මාසික සාරාංශ වාර්තාව | Form H-509 Return</div>
    <div class="form-title">FORM H509: PHM MONTHLY SUMMARY RETURN</div>
  </div>

  <!-- METADATA GRID -->
  <div class="meta-grid">
    <div class="meta-row">
      <div class="meta-cell"><span class="meta-label">MOH Division:</span> <span class="meta-val">${metadata.mohDivision}</span></div>
      <div class="meta-cell"><span class="meta-label">PHM Area:</span> <span class="meta-val">${metadata.phmAreaName}</span></div>
      <div class="meta-cell"><span class="meta-label">Reporting Period:</span> <span class="meta-val">${metadata.reportingPeriod}</span></div>
    </div>
  </div>

  <!-- SECTION 1: ANTENATAL CARE -->
  <div class="section-title">1. Antenatal Care & Risk Categorization (පූර්ව ප්‍රසව සත්කාරය)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Indicator Description</th>
        <th class="text-center" style="width: 25%;">Monthly Count</th>
        <th>Clinical Notes & Benchmarks</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Active Pregnant Mothers Registered at Month-End</td>
        <td class="text-center num">${section1_antenatal.activePregnantMothers}</td>
        <td>Total under active domiciliary care</td>
      </tr>
      <tr>
        <td>New Antenatal Registrations this Month</td>
        <td class="text-center num">${section1_antenatal.newRegistrations}</td>
        <td>First clinic / field registration</td>
      </tr>
      <tr>
        <td><strong>Risk Distribution (Traffic-Light System)</strong></td>
        <td class="text-center">
          <span class="risk-badge badge-red">RED: ${section1_antenatal.riskBreakdown.red} (${redPct}%)</span>
          <span class="risk-badge badge-yellow">YEL: ${section1_antenatal.riskBreakdown.yellow} (${yellowPct}%)</span>
          <span class="risk-badge badge-green">GRN: ${section1_antenatal.riskBreakdown.green} (${greenPct}%)</span>
        </td>
        <td>RED requires 7-day follow-up; YELLOW requires 14-day follow-up</td>
      </tr>
      <tr>
        <td>Total Antenatal Visits Conducted</td>
        <td class="text-center num">${section1_antenatal.totalVisits}</td>
        <td>Home: ${section1_antenatal.homeVisits} | Clinic: ${section1_antenatal.clinicVisits} | Phone: ${section1_antenatal.phoneVisits}</td>
      </tr>
      <tr>
        <td>Urgent VOG Specialist Referrals Triggered</td>
        <td class="text-center num" style="color: #DC2626;">${section1_antenatal.urgentReferralsTriggered}</td>
        <td>Due to active danger signs or BP &ge; 140/90 mmHg</td>
      </tr>
      <tr>
        <td>Moderate/Severe Maternal Anemia (Hb &lt; 10.0 g/dL)</td>
        <td class="text-center num">${section1_antenatal.lowHemoglobinCount}</td>
        <td>Prescribed double-dose Iron & nutritional counseling</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2: DELIVERIES & BIRTH OUTCOMES -->
  <div class="section-title">2. Deliveries & Pregnancy Outcomes (බිහිසුණු හා ප්‍රසූත ප්‍රතිඵල)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Outcome Category</th>
        <th class="text-center" style="width: 25%;">Count</th>
        <th>Delivery Mode / Category Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total Live Births Delivered in Month</td>
        <td class="text-center num">${section2_deliveries.totalDeliveries}</td>
        <td>Normal Vaginal: ${section2_deliveries.vaginalDeliveries} | C-Section: ${section2_deliveries.caesareanDeliveries} | Instrumental: ${section2_deliveries.instrumentalDeliveries}</td>
      </tr>
      <tr>
        <td>Miscarriages / Early Pregnancy Losses</td>
        <td class="text-center num">${section2_deliveries.miscarriagesRecorded}</td>
        <td>Referred for post-abortal care & pre-conception counseling</td>
      </tr>
      <tr>
        <td>Low Birth Weight Babies (&lt; 2.50 kg)</td>
        <td class="text-center num" style="color: #D97706;">${section2_deliveries.lowBirthWeightCount}</td>
        <td>Enrolled in special LBW weekly home-care visit schedule</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 3: CHILD HEALTH & NUTRITION -->
  <div class="section-title">3. Child Health & Nutrition (0–5 Years) (ළමා සෞඛ්‍යය හා පෝෂණය)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Nutrition & Growth Metric</th>
        <th class="text-center" style="width: 25%;">Tally</th>
        <th>MOH Standard / Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total Registered Children (0–5 yrs)</td>
        <td class="text-center num">${section3_childHealth.totalRegisteredChildren}</td>
        <td>Active CHDR cohort in PHM area</td>
      </tr>
      <tr>
        <td>Children Weighed & Screened this Month</td>
        <td class="text-center num">${section3_childHealth.childrenWeighedInMonth} (${section3_childHealth.weighingCoveragePercent}%)</td>
        <td>Monthly Weighing Coverage Target &ge; 90%</td>
      </tr>
      <tr>
        <td>Nutrition Status Distribution</td>
        <td class="text-center">
          <span class="risk-badge badge-green">Normal: ${section3_childHealth.nutritionStatus.normal}</span>
          <span class="risk-badge badge-yellow">MAM: ${section3_childHealth.nutritionStatus.mam}</span>
          <span class="risk-badge badge-red">SAM: ${section3_childHealth.nutritionStatus.sam}</span>
        </td>
        <td>WHO Weight-for-Age Z-Score standard</td>
      </tr>
      <tr>
        <td>Growth Faltering Alerts Flagged</td>
        <td class="text-center num" style="color: #DC2626;">${section3_childHealth.activeGrowthFalteringAlerts}</td>
        <td>Weight static/dropping across 2 consecutive monthly checks</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 4: EPI IMMUNIZATIONS -->
  <div class="section-title">4. National EPI Immunization Return (ජාතික ප්‍රතිශක්තිකරණ වාර්තාව)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Vaccine Type</th>
        <th class="text-center">Doses Given</th>
        <th>Vaccine Type</th>
        <th class="text-center">Doses Given</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>BCG (Birth)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['BCG'] || 0}</td>
        <td>Pentavalent 1 (2 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['PENTA1'] || 0}</td>
      </tr>
      <tr>
        <td>OPV 1 (2 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['OPV1'] || 0}</td>
        <td>fIPV 1 (2 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['FIPV1'] || 0}</td>
      </tr>
      <tr>
        <td>Pentavalent 2 (4 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['PENTA2'] || 0}</td>
        <td>Pentavalent 3 (6 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['PENTA3'] || 0}</td>
      </tr>
      <tr>
        <td>MMR 1 (9 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['MMR1'] || 0}</td>
        <td>Live JE (12 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['LIVE_JE'] || 0}</td>
      </tr>
      <tr>
        <td>DTP 4 / OPV 4 (18 Months)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['DTP4'] || 0}</td>
        <td>MMR 2 (3 Years)</td>
        <td class="text-center num">${section4_immunizations.vaccineDosesGiven['MMR2'] || 0}</td>
      </tr>
      <tr style="background: #EFF6FF; font-weight: bold;">
        <td>Total EPI Doses Administered in Month</td>
        <td class="text-center num" style="color: #1D4ED8;">${section4_immunizations.totalDosesInMonth}</td>
        <td>Currently Overdue Vaccines in Area</td>
        <td class="text-center num" style="color: #DC2626;">${section4_immunizations.currentlyOverdueDoses}</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 5: PRIORITY FOLLOW-UP APPENDIX -->
  <div class="section-title">5. Priority High-Risk (RED) Follow-Up List (ඉහළ අවදානම් පසු විපරම)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Beneficiary Name</th>
        <th>NIC / Identity</th>
        <th>GN Division</th>
        <th>POA</th>
        <th>Primary Clinical Risk Factors</th>
      </tr>
    </thead>
    <tbody>
      ${
        section5_priorityFollowUp.redRiskMothers.length === 0
          ? '<tr><td colspan="5" class="text-center">No active RED risk mothers in this area.</td></tr>'
          : section5_priorityFollowUp.redRiskMothers
              .map(
                (m) => `<tr>
                  <td><strong>${m.name}</strong></td>
                  <td>${m.nic}</td>
                  <td>${m.gnDivision}</td>
                  <td>${m.poaString}</td>
                  <td style="color: #991B1B;">${m.riskReasons.join('; ') || 'High clinical score'}</td>
                </tr>`
              )
              .join('')
      }
    </tbody>
  </table>

  <!-- SIGNATURES & VERIFICATION -->
  <div class="signatures-block">
    <div class="sig-row">
      <div class="sig-cell">
        <div class="sig-line">Prepared by: Public Health Midwife (PHM)</div>
        <div class="sig-role">Signature & Date • Digital Seal</div>
      </div>
      <div class="sig-cell">
        <div class="sig-line">Checked by: PHNS (Nursing Sister)</div>
        <div class="sig-role">Field Verification & Supervisory Review</div>
      </div>
      <div class="sig-cell">
        <div class="sig-line">Approved by: Medical Officer of Health (MOH)</div>
        <div class="sig-role">Official MOH Division Stamp & Date</div>
      </div>
    </div>
  </div>

  <div class="watermark">
    Generated automatically via Daruneli (දරුනැලි) Offline-First PHM Digital System on ${metadata.generatedAt}. Form H509 Compliant. • Daruneli Maternal & Child Health System
  </div>

</body>
</html>`;
}
