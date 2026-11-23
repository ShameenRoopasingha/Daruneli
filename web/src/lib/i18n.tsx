'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'si';

interface Translations {
  [key: string]: {
    en: string;
    si: string;
  };
}

export const DICTIONARY: Translations = {
  // Brand & Header
  'app.title': { en: 'Daruneli MOH Portal', si: 'දරුනැළි සෞඛ්‍ය වෛද්‍ය නිලධාරී පද්ධතිය' },
  'app.subtitle': { en: 'PHNS & MOH Midwifery Supervision Portal', si: 'මහජන සෞඛ්‍ය හෙද සොයුරිය සහ වෛද්‍ය නිලධාරී අධීක්ෂණ ද්වාරය' },
  'app.demo_badge': { en: 'Offline Demo Mode (Maharagama MOH)', si: 'නොබැඳි ආදර්ශන ප්‍රකාරය (මහරගම MOH)' },
  'nav.overview': { en: 'Division Overview', si: 'ප්‍රාදේශීය දළ විශ්ලේෂණය' },
  'nav.escalations': { en: 'Escalation Radar', si: 'අධි අවදානම් හදිසි පෝලිම' },
  'nav.reports': { en: 'H509 Monthly Reports', si: 'H509 මාසික වාර්තා' },
  'nav.supervision': { en: 'Supervision & Timetables', si: 'ක්ෂේත්‍ර අධීක්ෂණය සහ කාලසටහන්' },
  'nav.areas': { en: 'PHM Areas & Staff', si: 'PHM කොට්ඨාස සහ කාර්ය මණ්ඩලය' },
  'nav.sign_out': { en: 'Sign Out', si: 'පද්ධතියෙන් ඉවත් වන්න' },

  // Overview Page
  'overview.kpi_areas': { en: 'Active PHM Areas', si: 'ක්‍රියාකාරී PHM කොට්ඨාස' },
  'overview.kpi_mothers': { en: 'Active Pregnancies', si: 'ක්‍රියාකාරී ගර්භනී මව්වරුන්' },
  'overview.kpi_escalations': { en: 'Critical Escalations Open', si: 'විසඳීමට ඇති බරපතල අවදානම්' },
  'overview.kpi_children': { en: 'Registered Children (0–5y)', si: 'ලියාපදිංචි දරුවන් (අවු 0–5)' },
  'overview.kpi_nutrition': { en: 'Nutrition Watchlist', si: 'පෝෂණ අවදානම් නිරීක්ෂණ' },
  'overview.kpi_vaccines': { en: 'EPI Vaccine Coverage', si: 'ජාතික එන්නත් ආවරණය' },

  'chart.maternal_risk_title': { en: 'Maternal Clinical Risk Distribution by PHM Area', si: 'PHM කොට්ඨාස අනුව මාතෘ අවදානම් මට්ටම් බෙදීයාම' },
  'chart.coverage_title': { en: 'Child Weighing & Vaccine Coverage by PHM Area', si: 'PHM කොට්ඨාස අනුව දරු කිරුම් සහ එන්නත් ආවරණ ප්‍රතිශතය' },
  'table.scorecard_title': { en: 'PHM Area Division Scorecard', si: 'PHM කොට්ඨාස කාර්ය සාධන සාරාංශය' },
  'table.col_area': { en: 'PHM Area', si: 'PHM කොට්ඨාසය' },
  'table.col_officer': { en: 'Assigned PHM', si: 'නියමිත වින්නඹු මාතාව' },
  'table.col_mothers': { en: 'Mothers', si: 'මව්වරුන්' },
  'table.col_red_risk': { en: 'RED Risk', si: 'රතු අවදානම්' },
  'table.col_children': { en: 'Children', si: 'දරුවන්' },
  'table.col_faltering': { en: 'Faltering / MAM', si: 'වර්ධනය බාලවීම / MAM' },
  'table.col_overdue_tasks': { en: 'Overdue Tasks', si: 'ප්‍රමාද වූ කාර්යයන්' },
  'table.col_overdue_vax': { en: 'Overdue Vaccines', si: 'ප්‍රමාද එන්නත්' },
  'table.col_last_sync': { en: 'Last Sync', si: 'අවසන් සමමුහුර්තය' },

  // Escalations Page
  'escalation.title': { en: 'High-Risk Clinical Escalation Radar', si: 'අධි අවදානම් සායනික හදිසි පෝලිම' },
  'escalation.subtitle': { en: 'Real-time safety queue aggregating maternal danger signs, MEOWS alerts, and child malnutrition', si: 'මාතෘ අනතුරු ලකුණු, MEOWS රතු නිවේදන සහ ළමා මන්දපෝෂණ හදිසි අවස්ථා ක්ෂණිකව නිරීක්ෂණය' },
  'filter.all_areas': { en: 'All PHM Areas', si: 'සියලුම PHM කොට්ඨාස' },
  'filter.all_categories': { en: 'All Alert Categories', si: 'සියලුම අනතුරු වර්ග' },
  'filter.all_statuses': { en: 'All Review Statuses', si: 'සියලුම තත්වයන්' },
  'action.review': { en: 'Inspect Case', si: 'පරීක්ෂා කරන්න' },
  'action.mark_ack': { en: 'Acknowledge Alert', si: 'තහවුරු කර භාරගන්න' },
  'action.request_followup': { en: 'Request Follow-up', si: 'ක්ෂේත්‍ර පරීක්ෂාවක් නියම කරන්න' },
  'action.resolve': { en: 'Mark Resolved', si: 'විසඳා අවසන් කරන්න' },
  'drawer.vitals_history': { en: 'Recent Clinical Vitals', si: 'මෑතකාලීන සායනික සටහන්' },
  'drawer.voice_note': { en: 'Field Voice Note Recording', si: 'ක්ෂේත්‍ර හඬ සටහන' },
  'drawer.supervisor_action': { en: 'Supervisor Directive & Notes', si: 'අධීක්ෂණ උපදෙස් සහ සටහන්' },
  'drawer.directions': { en: 'Google Maps Directions', si: 'ගූගල් සිතියම් මග පෙන්වීම' },

  // H509 Reports
  'h509.title': { en: 'Monthly Midwifery Report (Form H 509)', si: 'පවුල් සෞඛ්‍ය සේවා මාසික වාර්තාව (H 509 ආකෘතිය)' },
  'h509.division_scope': { en: 'Entire MOH Division (Combined)', si: 'සම්පූර්ණ සෞඛ්‍ය වෛද්‍ය නිලධාරී කොට්ඨාසය (ඒකාබද්ධ)' },
  'h509.print_btn': { en: 'Print / Save Official A4 PDF', si: 'නිල A4 PDF ලෙස මුද්‍රණය' },
  'h509.csv_btn': { en: 'Export CSV (Excel)', si: 'Excel (CSV) බාගත කරන්න' },
  'h509.sec1': { en: '1. Antenatal Care & Maternal Health', si: '1. ගර්භණී සමයේ සත්කාර සහ මාතෘ සෞඛ්‍යය' },
  'h509.sec2': { en: '2. Deliveries & Birth Outcomes', si: '2. ප්‍රසූතීන් සහ උපත් ප්‍රථිපල' },
  'h509.sec3': { en: '3. Child Health & Nutrition Growth', si: '3. ළමා සෞඛ්‍යය සහ පෝෂණ තත්වය' },
  'h509.sec4': { en: '4. Expanded Programme on Immunization (EPI)', si: '4. ජාතික ප්‍රතිශක්තිකරණ වැඩසටහන' },
  'h509.sec5': { en: '5. High-Risk & Overdue Supervision Appendix', si: '5. අධි අවදානම් සහ ප්‍රමාද වූ ලේඛන උපග්‍රන්ථය' },

  // Supervision Page
  'supervision.tab_timetables': { en: 'Weekly Advance Programmes', si: 'සතිපතා ක්ෂේත්‍ර සැලසුම්' },
  'supervision.tab_transfers': { en: 'Mother Transfers (Temp-Out & Relocations)', si: 'මව්වරුන්ගේ ස්ථාන මාරුවීම් සහ තාවකාලික පිටවීම්' },
  'supervision.tab_sms': { en: 'Automated SMS Reminder Audit', si: 'ස්වයංක්‍රීය කෙටිපණිවුඩ (SMS) සටහන්' },

  // Staff & User Management
  'nav.users': { en: 'Staff & Users', si: 'කාර්ය මණ්ඩලය සහ පරිශීලකයන්' },
  'users.title': { en: 'Staff & User Management', si: 'කාර්ය මණ්ඩලය සහ පරිශීලක කළමනාකරණය' },
  'users.subtitle': { en: 'Manage PHM field staff, supervisory officers, assigned clinic areas, and authentication credentials.', si: 'PHM ක්ෂේත්‍ර නිලධාරිනියන්, අධීක්ෂණ නිලධාරීන්, පවරා ඇති සායනික කොට්ඨාස සහ පිවිසුම් දත්ත කළමනාකරණය.' },
  'users.add_staff': { en: 'Provision New Staff Member', si: 'නව නිලධාරියෙකු ලියාපදිංචි කරන්න' },
  'users.kpi_total': { en: 'Total Staff', si: 'මුළු කාර්ය මණ්ඩලය' },
  'users.kpi_active_phm': { en: 'Active PHMs', si: 'ක්‍රියාකාරී PHM වරුන්' },
  'users.kpi_supervisors': { en: 'Supervisors (MOH/PHNS)', si: 'අධීක්ෂණ නිලධාරීන්' },
  'users.kpi_deactivated': { en: 'Deactivated Accounts', si: 'අක්‍රිය කළ ගිණුම්' },
  'users.kpi_vacant': { en: 'Vacant Areas', si: 'පුරප්පාඩු කොට්ඨාස' },
  'users.tab_directory': { en: 'Staff Directory', si: 'කාර්ය මණ්ඩල නාමාවලිය' },
  'users.tab_audit': { en: 'Security & Audit Logs', si: 'ආරක්ෂක සහ විගණන සටහන්' },
  'users.col_employee_id': { en: 'Service ID', si: 'සේවා අංකය' },
  'users.col_name': { en: 'Staff Officer', si: 'නිලධාරියාගේ නම' },
  'users.col_role': { en: 'Role', si: 'තනතුර' },
  'users.col_area': { en: 'Assigned PHM Area', si: 'පවරන ලද PHM කොට්ඨාසය' },
  'users.col_contact': { en: 'Contact Details', si: 'සම්බන්ධතා තොරතුරු' },
  'users.col_status': { en: 'Account Status', si: 'ගිණුමේ තත්වය' },
  'users.col_last_login': { en: 'Last Active', si: 'අවසන් පිවිසුම' },
  'users.col_actions': { en: 'Actions', si: 'ක්‍රියාමාර්ග' },
  'users.edit': { en: 'Edit Profile & Area', si: 'තොරතුරු සහ කොට්ඨාසය වෙනස් කරන්න' },
  'users.reset_password': { en: 'Reset Password', si: 'මුරපදය යළි සකසන්න' },
  'users.deactivate': { en: 'Deactivate Account', si: 'ගිණුම අක්‍රිය කරන්න' },
  'users.reactivate': { en: 'Reactivate Account', si: 'ගිණුම යළි සක්‍රිය කරන්න' },
  'users.active': { en: 'Active', si: 'ක්‍රියාකාරී' },
  'users.deactivated': { en: 'Locked / Deactivated', si: 'අක්‍රියයි / අත්හිටුවා ඇත' },
  'users.moh_only_warning': { en: 'Only Medical Officers of Health (MOH) have permission to provision or modify staff accounts.', si: 'කාර්ය මණ්ඩල ගිණුම් සෑදීම හෝ වෙනස් කිරීම කළ හැක්කේ සෞඛ්‍ය වෛද්‍ය නිලධාරීන්ට (MOH) පමණි.' },


  // Common
  'common.loading': { en: 'Loading...', si: 'පූරණය වෙමින් පවතී...' },
  'common.date': { en: 'Date', si: 'දිනය' },
  'common.status': { en: 'Status', si: 'තත්වය' },
  'common.notes': { en: 'Notes', si: 'සටහන්' },
  'common.save': { en: 'Save', si: 'සුරකින්න' },
  'common.cancel': { en: 'Cancel', si: 'අවලංගු කරන්න' },
  'common.search': { en: 'Search...', si: 'සොයන්න...' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('suwa_web_lang') as Language;
    if (saved === 'en' || saved === 'si') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('suwa_web_lang', lang);
  };

  const t = (key: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return key;
    return entry[language] || entry.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
