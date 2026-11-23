import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MotherWithPregnancy, AntenatalVisit } from '../db/motherRepo';

export interface HandoverPdfParams {
  mother: MotherWithPregnancy;
  visits: AntenatalVisit[];
  transferType: 'TEMP_OUT' | 'PERMANENT_TRANSFER';
  destinationArea?: string;
  expectedReturnDate?: string;
  transferNote?: string;
  phmAreaName?: string;
  mohDivision?: string;
}

function formatDate(isoOrDmy?: string | null): string {
  if (!isoOrDmy) return '-';
  if (isoOrDmy.includes('/')) return isoOrDmy;
  const parts = isoOrDmy.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoOrDmy;
}

export function renderHandoverHtml(params: HandoverPdfParams): string {
  const {
    mother,
    visits,
    transferType,
    destinationArea = 'Not Specified',
    expectedReturnDate,
    transferNote,
    phmAreaName = 'Kottawa North (PHM/MAH/01)',
    mohDivision = 'Maharagama MOH Division',
  } = params;

  const riskColor =
    mother.risk_level === 'RED'
      ? '#DC2626'
      : mother.risk_level === 'YELLOW'
      ? '#D97706'
      : '#059669';

  let riskFactors: string[] = [];
  try {
    if (mother.risk_factors_json) {
      riskFactors = JSON.parse(mother.risk_factors_json);
    }
  } catch {
    riskFactors = [];
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Maternal Handover Summary - ${mother.full_name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0F172A;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #0D9488;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .national-title {
      font-size: 11px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #64748B;
      font-weight: 700;
    }
    .main-title {
      font-size: 20px;
      font-weight: 800;
      color: #0D9488;
      margin: 4px 0;
    }
    .subtitle {
      font-size: 12px;
      color: #475569;
    }
    .transfer-badge-box {
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .transfer-type {
      font-size: 15px;
      font-weight: 800;
      color: #0F766E;
    }
    .section-card {
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      border-bottom: 1px dashed #CBD5E1;
      padding-bottom: 4px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px 16px;
    }
    .data-item {
      display: flex;
      flex-direction: column;
    }
    .data-label {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
    }
    .data-val {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
    }
    .risk-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 800;
      background: ${riskColor};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #E2E8F0;
      padding: 8px;
      text-align: left;
      font-size: 12px;
    }
    th {
      background: #F8FAFC;
      font-weight: 700;
      color: #475569;
    }
    .signature-area {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      padding-top: 16px;
      border-top: 1px solid #CBD5E1;
    }
    .sig-line {
      border-bottom: 1px solid #0F172A;
      margin-top: 36px;
      margin-bottom: 6px;
    }
    .sig-title {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="national-title">Family Health Bureau • Ministry of Health Sri Lanka</div>
    <div class="main-title">Maternal Clinical Handover Summary (H544 Transfer Record)</div>
    <div class="subtitle">Origin Area: ${phmAreaName} | ${mohDivision}</div>
  </div>

  <div class="transfer-badge-box">
    <div>
      <div class="transfer-type">
        ${transferType === 'TEMP_OUT' ? 'TEMPORARY RELOCATION (TEMP_OUT)' : 'PERMANENT AREA TRANSFER'}
      </div>
      <div style="font-size: 12px; color: #0F766E; margin-top: 3px;">
        Destination Area: <strong>${destinationArea}</strong>
      </div>
    </div>
    ${
      expectedReturnDate
        ? `<div style="text-align: right;">
            <div style="font-size: 11px; color: #64748B;">Expected Return Date</div>
            <div style="font-size: 14px; font-weight: 800; color: #0F172A;">${formatDate(expectedReturnDate)}</div>
          </div>`
        : ''
    }
  </div>

  <!-- 1. Demographics -->
  <div class="section-card">
    <div class="section-title">1. Mother & Family Identification</div>
    <div class="grid-3">
      <div class="data-item">
        <span class="data-label">Mother's Full Name</span>
        <span class="data-val">${mother.full_name}</span>
      </div>
      <div class="data-item">
        <span class="data-label">NIC Number</span>
        <span class="data-val">${mother.nic || 'Not recorded'}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Date of Birth / Age</span>
        <span class="data-val">${formatDate(mother.dob)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Eligible Family No</span>
        <span class="data-val">${mother.eligible_family_no || 'Pending'}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Blood Group</span>
        <span class="data-val">${mother.blood_group || 'Unknown'}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Contact Phone</span>
        <span class="data-val">${mother.phone || mother.emergency_phone || '-'}</span>
      </div>
      <div class="data-item" style="grid-column: span 3;">
        <span class="data-label">Residential Address</span>
        <span class="data-val">${mother.address || 'GN: ' + (mother.gn_division || 'Unknown')}</span>
      </div>
    </div>
  </div>

  <!-- 2. Obstetric & Pregnancy Clinical Profile -->
  <div class="section-card">
    <div class="section-title">2. Obstetric History & Risk Assessment</div>
    <div class="grid-3">
      <div class="data-item">
        <span class="data-label">Current Risk Tier</span>
        <span class="data-val"><span class="risk-pill">${mother.risk_level || 'GREEN'} TIER</span></span>
      </div>
      <div class="data-item">
        <span class="data-label">Gravida / Para</span>
        <span class="data-val">G${mother.gravida ?? 1} P${mother.para ?? 0}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Expected Delivery Date (EDD)</span>
        <span class="data-val">${formatDate(mother.edd_date)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Last Menstrual Period (LRMP)</span>
        <span class="data-val">${formatDate(mother.lrmp_date)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Previous Miscarriages</span>
        <span class="data-val">${mother.prev_miscarriages_count || 0}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Previous C-Sections</span>
        <span class="data-val">${mother.prev_c_sections_count || 0}</span>
      </div>
    </div>

    ${
      riskFactors.length > 0
        ? `<div style="margin-top: 10px; background: #FEF2F2; border: 1px solid #FECACA; padding: 8px 12px; border-radius: 6px;">
            <strong style="color: #991B1B; font-size: 11.5px;">Flagged Risk Factors:</strong>
            <span style="color: #7F1D1D; font-size: 12px; margin-left: 6px;">${riskFactors.join(', ')}</span>
          </div>`
        : ''
    }

    ${
      transferNote
        ? `<div style="margin-top: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 6px;">
            <strong style="color: #334155; font-size: 11.5px;">Transfer Handover Remarks:</strong>
            <span style="color: #475569; font-size: 12px; margin-left: 6px;">${transferNote}</span>
          </div>`
        : ''
    }
  </div>

  <!-- 3. Recent Clinical Visits -->
  <div class="section-card">
    <div class="section-title">3. Antenatal Clinical Trajectory (Recent Visits)</div>
    <table>
      <thead>
        <tr>
          <th>Visit Date</th>
          <th>Type</th>
          <th>POA</th>
          <th>Weight</th>
          <th>BP</th>
          <th>SFH</th>
          <th>Clinical Notes & Danger Signs</th>
        </tr>
      </thead>
      <tbody>
        ${
          visits.length === 0
            ? '<tr><td colspan="7" style="text-align: center; color: #94A3B8;">No clinic visits recorded yet.</td></tr>'
            : visits
                .slice(0, 5)
                .map((v) => {
                  let dangerSigns: string[] = [];
                  try {
                    dangerSigns = JSON.parse(v.danger_signs_json);
                  } catch {
                    dangerSigns = [];
                  }
                  return `
                    <tr>
                      <td>${formatDate(v.visit_date)}</td>
                      <td>${v.visit_type}</td>
                      <td>${v.poa_weeks ? v.poa_weeks + 'w' : '-'}</td>
                      <td>${v.weight_kg ? v.weight_kg + 'kg' : '-'}</td>
                      <td>${v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '-'}</td>
                      <td>${v.sfh_cm ? v.sfh_cm + 'cm' : '-'}</td>
                      <td>
                        ${dangerSigns.length > 0 ? `<span style="color: #DC2626; font-weight: 700;">[⚠️ ${dangerSigns.join(', ')}]</span> ` : ''}
                        ${v.notes || '-'}
                      </td>
                    </tr>
                  `;
                })
                .join('')
        }
      </tbody>
    </table>
  </div>

  <!-- Signature Section -->
  <div class="signature-area">
    <div>
      <div class="sig-line"></div>
      <div class="sig-title">Transferring Public Health Midwife (Signature & Stamp)</div>
      <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">Date: ${formatDate(new Date().toISOString().split('T')[0])}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-title">Receiving Public Health Midwife / MOH Office Acknowledgment</div>
      <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">Date of Handover Receipt: ___________________</div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function generateAndShareHandoverPdf(params: HandoverPdfParams): Promise<string> {
  const html = renderHandoverHtml(params);
  const { uri } = await Print.printToFileAsync({
    html,
    margins: { left: 24, top: 24, right: 24, bottom: 24 },
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    const filename = `Handover_${params.mother.full_name.replace(/\s+/g, '_')}_${params.transferType}.pdf`;
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: '.pdf',
      dialogTitle: filename,
    });
  }
  return uri;
}
