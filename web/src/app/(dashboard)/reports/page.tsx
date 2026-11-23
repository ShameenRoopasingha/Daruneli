'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Printer,
  Download,
  Calendar,
  Building,
  CheckCircle,
  FileText,
  UserCheck,
  MapPin,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getH509Report, getAreaSummaries } from '@/lib/dataService';
import { H509Report, PhmAreaSummary } from '@/lib/types';
import { formatDate } from '@/lib/dateFormat';

export default function H509ReportsPage() {
  const { t } = useLanguage();
  const [report, setReport] = useState<H509Report | null>(null);
  const [areas, setAreas] = useState<PhmAreaSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(11); // November
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const [rep, areaList] = await Promise.all([
          getH509Report(selectedMonth, selectedYear, selectedAreaId),
          getAreaSummaries(),
        ]);
        setReport(rep);
        setAreas(areaList);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [selectedMonth, selectedYear, selectedAreaId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!report) return;

    // Build CSV with UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility with Sinhala text
    let csv = '\uFEFF';
    csv += 'H509 MONTHLY MATERNAL & CHILD HEALTH RETURN\n';
    csv += `MOH Division,${report.metadata.mohDivision}\n`;
    csv += `Scope,${report.metadata.phmAreaName}\n`;
    csv += `Reporting Period,${report.metadata.reportingPeriod}\n`;
    csv += `Generated Date,${formatDate(new Date())}\n\n`;

    // Section 1
    csv += 'SECTION 1: ANTENATAL CARE & MATERNAL HEALTH\n';
    csv += `Eligible Families,${report.section1_antenatal.totalEligibleFamilies}\n`;
    csv += `Active Pregnant Mothers,${report.section1_antenatal.activeMothers}\n`;
    csv += `New Registrations This Month,${report.section1_antenatal.newRegistrationsThisMonth}\n`;
    csv += `Registered <12 Weeks POA,${report.section1_antenatal.registeredBefore12Weeks}\n`;
    csv += `Risk RED,${report.section1_antenatal.riskBreakdown.red}\n`;
    csv += `Risk YELLOW,${report.section1_antenatal.riskBreakdown.yellow}\n`;
    csv += `Risk GREEN,${report.section1_antenatal.riskBreakdown.green}\n`;
    csv += `Home Visits,${report.section1_antenatal.totalHomeVisits}\n`;
    csv += `Clinic Visits,${report.section1_antenatal.totalClinicVisits}\n`;
    csv += `Mothers with Low Hb (<10g/dL),${report.section1_antenatal.mothersWithLowHb}\n`;
    csv += `Urgent Hospital Referrals,${report.section1_antenatal.urgentHospitalReferrals}\n\n`;

    // Section 2
    csv += 'SECTION 2: DELIVERIES & BIRTH OUTCOMES\n';
    csv += `Total Deliveries,${report.section2_deliveries.totalDeliveries}\n`;
    csv += `Normal Vaginal Deliveries,${report.section2_deliveries.normalVaginalDeliveries}\n`;
    csv += `Caesarean Sections (LSCS),${report.section2_deliveries.cesareanSections}\n`;
    csv += `Instrumental Deliveries,${report.section2_deliveries.instrumentalDeliveries}\n`;
    csv += `Live Births,${report.section2_deliveries.liveBirths}\n`;
    csv += `Stillbirths,${report.section2_deliveries.stillbirths}\n`;
    csv += `Low Birth Weight (<2.5kg),${report.section2_deliveries.lowBirthWeightBabies}\n\n`;

    // Section 3
    csv += 'SECTION 3: CHILD HEALTH & NUTRITION\n';
    csv += `Registered Children (0-5y),${report.section3_childHealth.registeredChildren0to5}\n`;
    csv += `Weighed This Month,${report.section3_childHealth.weighedThisMonth}\n`;
    csv += `Weighing Percentage,${report.section3_childHealth.weighingPercentage}%\n`;
    csv += `Normal Nutrition,${report.section3_childHealth.nutritionStatus.normal}\n`;
    csv += `MAM Count,${report.section3_childHealth.nutritionStatus.mam}\n`;
    csv += `SAM Count,${report.section3_childHealth.nutritionStatus.sam}\n`;
    csv += `Growth Faltering Count,${report.section3_childHealth.growthFalteringCount}\n\n`;

    // Section 4
    csv += 'SECTION 4: EPI IMMUNIZATION\n';
    csv += `BCG Administered,${report.section4_immunization.bcgCount}\n`;
    csv += `Pentavalent Administered,${report.section4_immunization.pentavalentCount}\n`;
    csv += `MMR Administered,${report.section4_immunization.mmrCount}\n`;
    csv += `OPV Administered,${report.section4_immunization.opvCount}\n`;
    csv += `Overdue Vaccines,${report.section4_immunization.overdueVaccinesCount}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `H509_${report.metadata.mohDivision.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* Control Toolbar (Hidden during Print) */}
      <div className="no-print p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('h509.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official Family Health Bureau (FHB) monthly consolidated returns
          </p>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scope Dropdown */}
          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">{t('h509.division_scope')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
          >
            {months.map((m) => (
              <option key={m.num} value={m.num}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* Export Buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">{t('h509.print_btn')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('h509.csv_btn')}</span>
          </button>
        </div>
      </div>

      {/* Official A4 Document Card */}
      {report && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-6 sm:p-10 space-y-8 text-slate-900 dark:text-white max-w-5xl mx-auto print:shadow-none print:border-none print:p-0">
          {/* Document Header (Bilingual Official Sri Lankan Format) */}
          <div className="border-b-2 border-slate-900 dark:border-slate-300 pb-5 text-center">
            {/* Top Brand Strip for Web and Print */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="relative w-44 h-16">
                <Image
                  src="/images/daruneli-logo.png"
                  alt="Daruneli Maternal & Child Health System"
                  fill
                  sizes="176px"
                  className="object-contain object-left"
                />
              </div>

              {/* Official State Emblem of Sri Lanka */}
              <div className="flex flex-col items-center">
                <div className="relative w-11 h-16">
                  <Image
                    src="/images/sri-lanka-emblem.png"
                    alt="State Emblem of Sri Lanka"
                    fill
                    sizes="44px"
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-black tracking-wider text-teal-800 dark:text-teal-400 uppercase block">
                  DARUNELI DIGITAL HEALTH SYSTEM
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Form H509 Return • Daruneli Maternal & Child Health System
                </span>
              </div>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              ශ්‍රී ලංකා ප්‍රජාතාන්ත්‍රික සමාජවාදී ජනරජය • සෞඛ්‍ය අමාත්‍යාංශය • පවුල් සෞඛ්‍ය කාර්යාංශය
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-0.5">
              Democratic Socialist Republic of Sri Lanka • Ministry of Health • Family Health Bureau
            </div>
            <h2 className="text-xl font-black mt-2 tracking-tight">
              පවුල් සෞඛ්‍ය සේවා මාසික වාර්තාව / MONTHLY RETURN (FORM H 509)
            </h2>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs font-semibold text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">MOH Division</span>
                <span>{report.metadata.mohDivision}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Scope / Area</span>
                <span>{report.metadata.phmAreaName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Reporting Period</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">{report.metadata.reportingPeriod}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Date of Return</span>
                <span>{formatDate(new Date())}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Antenatal Care */}
          <div className="print-avoid-break">
            <h3 className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-l-4 border-teal-600 uppercase tracking-wide">
              {t('h509.sec1')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Eligible Families</span>
                <span className="text-base font-extrabold">{report.section1_antenatal.totalEligibleFamilies}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Active Pregnancies</span>
                <span className="text-base font-extrabold">{report.section1_antenatal.activeMothers}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">New Registered (Month)</span>
                <span className="text-base font-extrabold">{report.section1_antenatal.newRegistrationsThisMonth}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Reg. &lt;12 Weeks POA</span>
                <span className="text-base font-extrabold text-emerald-600">{report.section1_antenatal.registeredBefore12Weeks}</span>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
              <div className="flex items-center gap-3">
                <span>Clinical Risk Tiers:</span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 font-bold">
                  RED: {report.section1_antenatal.riskBreakdown.red}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 font-bold">
                  YELLOW: {report.section1_antenatal.riskBreakdown.yellow}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-bold">
                  GREEN: {report.section1_antenatal.riskBreakdown.green}
                </span>
              </div>

              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                <span>Home Visits: <strong>{report.section1_antenatal.totalHomeVisits}</strong></span>
                <span>Clinic Visits: <strong>{report.section1_antenatal.totalClinicVisits}</strong></span>
                <span>Low Hb (&lt;10): <strong>{report.section1_antenatal.mothersWithLowHb}</strong></span>
                <span>Hospital Referrals: <strong>{report.section1_antenatal.urgentHospitalReferrals}</strong></span>
              </div>
            </div>
          </div>

          {/* Section 2: Deliveries & Birth Outcomes */}
          <div className="print-avoid-break">
            <h3 className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-l-4 border-teal-600 uppercase tracking-wide">
              {t('h509.sec2')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Total Deliveries</span>
                <span className="text-base font-extrabold">{report.section2_deliveries.totalDeliveries}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Normal Vaginal (NVD)</span>
                <span className="text-base font-extrabold">{report.section2_deliveries.normalVaginalDeliveries}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Caesarean (LSCS)</span>
                <span className="text-base font-extrabold">{report.section2_deliveries.cesareanSections}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Low Birth Weight (&lt;2.5kg)</span>
                <span className="text-base font-extrabold text-amber-600">{report.section2_deliveries.lowBirthWeightBabies}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Child Health & Nutrition */}
          <div className="print-avoid-break">
            <h3 className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-l-4 border-teal-600 uppercase tracking-wide">
              {t('h509.sec3')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Registered 0–5 yrs</span>
                <span className="text-base font-extrabold">{report.section3_childHealth.registeredChildren0to5}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">Weighed This Month</span>
                <span className="text-base font-extrabold">{report.section3_childHealth.weighedThisMonth} ({report.section3_childHealth.weighingPercentage}%)</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">MAM Children</span>
                <span className="text-base font-extrabold text-amber-600">{report.section3_childHealth.nutritionStatus.mam}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block">SAM (Severe Malnutrition)</span>
                <span className="text-base font-extrabold text-rose-600">{report.section3_childHealth.nutritionStatus.sam}</span>
              </div>
            </div>
          </div>

          {/* Section 4: EPI Immunization */}
          <div className="print-avoid-break">
            <h3 className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-l-4 border-teal-600 uppercase tracking-wide">
              {t('h509.sec4')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-xs text-center font-bold">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">BCG</span>
                <span className="text-sm font-black">{report.section4_immunization.bcgCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">Pentavalent (1-3)</span>
                <span className="text-sm font-black">{report.section4_immunization.pentavalentCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">MMR (1-2)</span>
                <span className="text-sm font-black">{report.section4_immunization.mmrCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">OPV</span>
                <span className="text-sm font-black">{report.section4_immunization.opvCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
                <span className="text-[10px] uppercase block font-bold">Overdue Vaccines</span>
                <span className="text-sm font-black">{report.section4_immunization.overdueVaccinesCount}</span>
              </div>
            </div>
          </div>

          {/* Section 5: High-Risk Appendix Table */}
          <div className="print-avoid-break">
            <h3 className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-l-4 border-rose-600 uppercase tracking-wide">
              {t('h509.sec5')}
            </h3>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Patient / Mother Name</th>
                    <th className="py-2 px-3">Area</th>
                    <th className="py-2 px-3">Risk Tier</th>
                    <th className="py-2 px-3">Clinical Risk Reasons</th>
                    <th className="py-2 px-3 text-right">EDD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {report.section5_appendix.highRiskMothers.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 px-3 font-bold">{m.name}</td>
                      <td className="py-2 px-3">{m.phmArea}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {m.riskLevel}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{m.riskFactors.join(', ')}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatDate(m.eddDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Signatures Footer (Visible in Print & Screen) */}
          <div className="pt-8 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-xs font-semibold print-avoid-break">
            <div className="space-y-1">
              <div className="h-10 border-b border-dashed border-slate-400 w-48" />
              <div className="font-bold">{report.metadata.preparedBy}</div>
              <div className="text-slate-500 text-[11px]">Public Health Nursing Sister (PHNS)</div>
              <div className="text-slate-400 text-[10px]">Date: {formatDate(new Date())}</div>
            </div>

            <div className="space-y-1 text-right flex flex-col items-end">
              <div className="h-10 border-b border-dashed border-slate-400 w-48" />
              <div className="font-bold">{report.metadata.approvedBy}</div>
              <div className="text-slate-500 text-[11px]">Medical Officer of Health (MOH)</div>
              <div className="text-slate-400 text-[10px]">Date: {formatDate(new Date())}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
