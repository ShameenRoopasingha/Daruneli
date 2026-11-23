'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Apple,
  Briefcase,
  Heart,
  Phone,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMotherPortal } from '@/lib/motherPortalI18n';

interface ChecklistItem {
  id: string;
  labelSi: string;
  labelTa: string;
  labelEn: string;
  category: 'DOCUMENTS' | 'MOTHER' | 'BABY';
}

const DELIVERY_BAG_ITEMS: ChecklistItem[] = [
  {
    id: 'doc_h512',
    labelSi: 'පූර්ව ප්‍රසව සායන වාර්තා පොත (Form H-512 Clinic Card)',
    labelTa: 'மகப்பேற்றுக்கு முந்தைய கிளினிக் அட்டை (H-512)',
    labelEn: 'Antenatal Clinical Record (Form H-512 Pink Card)',
    category: 'DOCUMENTS',
  },
  {
    id: 'doc_nic',
    labelSi: 'මවගේ සහ පියාගේ ජාතික හැඳුනුම්පත් (NIC Cards)',
    labelTa: 'தாய் மற்றும் தந்தையின் தேசிய அடையாள அட்டை (NIC)',
    labelEn: 'National Identity Cards (NIC) of Mother & Father',
    category: 'DOCUMENTS',
  },
  {
    id: 'doc_marriage',
    labelSi: 'විවාහ සහතිකය හෝ අදාළ ලියකියවිලි (Marriage Certificate)',
    labelTa: 'திருமணச் சான்றிதழ் (Marriage Certificate)',
    labelEn: 'Marriage Registration Certificate',
    category: 'DOCUMENTS',
  },
  {
    id: 'moth_clothes',
    labelSi: 'ඉදිරිපස විවෘත කළ හැකි ලිහිල් ගවුම් / ඇඳුම් 4ක්',
    labelTa: 'தாய்க்கு முன் திறக்கக்கூடிய 4 தளர்வான ஆடைகள்',
    labelEn: '4 Front-opening loose cotton nightgowns for mother',
    category: 'MOTHER',
  },
  {
    id: 'moth_pads',
    labelSi: 'ප්‍රසූතියෙන් පසු භාවිතයට සනීපාරක්ෂක තුවා (Maternity Pads)',
    labelTa: 'மகப்பேற்றுக்கு பிந்தைய சுகாதார பட்டைகள் (Maternity Pads)',
    labelEn: 'Maternity sanitary pads & disposable underwear',
    category: 'MOTHER',
  },
  {
    id: 'moth_toiletries',
    labelSi: 'තුවායක්, දත් බුරුසුව, සබන් සහ පනාව (Toiletries)',
    labelTa: 'துண்டு, பல் துலக்குவான், சவர்க்காரம் (Toiletries)',
    labelEn: 'Towel, toothbrush, toothpaste, bathing soap & comb',
    category: 'MOTHER',
  },
  {
    id: 'baby_clothes',
    labelSi: 'බිළිඳු කමිස සහ නැපි 6 බැගින් (Baby Shirts & Nappies)',
    labelTa: 'குழந்தை சட்டைகள் மற்றும் நாப்கின்கள் 6 வீதம்',
    labelEn: '6 Soft washed baby cotton shirts & 6 cloth nappies',
    category: 'BABY',
  },
  {
    id: 'baby_blanket',
    labelSi: 'බිළිඳා ඔතන රෙදි / බ්ලැන්කට් 2ක් (Baby Wrapping Sheets)',
    labelTa: 'குழந்தை போர்வைகள் 2 (Baby Blankets)',
    labelEn: '2 Soft flannel baby wrapping blankets',
    category: 'BABY',
  },
  {
    id: 'baby_cap_socks',
    labelSi: 'බිළිඳු හිස්වැසුම් සහ මේස් (Baby Cap & Booties)',
    labelTa: 'குழந்தை தொப்பி மற்றும் காலுறைகள் (Cap & Socks)',
    labelEn: 'Baby caps and cotton mittens/booties',
    category: 'BABY',
  },
];

export default function MotherGuidePage() {
  const { lang, t } = useMotherPortal();
  const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});
  const [openSection, setOpenSection] = useState<'DANGER' | 'NUTRITION' | 'BAG' | 'BREASTFEEDING'>('DANGER');

  // Load delivery bag checklist from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('daruneli_delivery_bag');
    if (saved) {
      try {
        setPackedItems(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const toggleItem = (id: string) => {
    const next = { ...packedItems, [id]: !packedItems[id] };
    setPackedItems(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daruneli_delivery_bag', JSON.stringify(next));
    }
  };

  const packedCount = Object.values(packedItems).filter(Boolean).length;
  const totalCount = DELIVERY_BAG_ITEMS.length;

  return (
    <div className="space-y-4 pt-1 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-slate-900 dark:text-white">
          {t.guide.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.guide.subtitle}
        </p>
      </div>

      {/* Accordion 1: Danger Signs (GO TO HOSPITAL IMMEDIATELY) */}
      <div className="rounded-3xl border-2 border-rose-400 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-950/40 overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={() => setOpenSection(openSection === 'DANGER' ? ('' as any) : 'DANGER')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-black text-rose-950 dark:text-rose-100 uppercase tracking-wide">
                {t.guide.dangerSignsTitle}
              </h2>
              <p className="text-[11px] text-rose-800 dark:text-rose-300 font-medium line-clamp-1">
                Emergency maternal danger signs
              </p>
            </div>
          </div>
          {openSection === 'DANGER' ? (
            <ChevronUp className="w-5 h-5 text-rose-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-rose-600" />
          )}
        </button>

        {openSection === 'DANGER' && (
          <div className="p-4 pt-0 space-y-3 border-t border-rose-200 dark:border-rose-800/80">
            <div className="space-y-2 text-xs font-medium text-rose-950 dark:text-rose-200">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 flex items-start gap-2">
                <span className="text-rose-600 font-bold">1.</span>
                <span>යෝනි මාර්ගයෙන් ලේ වහනය වීම හෝ වතුර යාම (Vaginal bleeding or fluid leakage)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 flex items-start gap-2">
                <span className="text-rose-600 font-bold">2.</span>
                <span>අධික හිසරදය, පෙනීම බොඳවීම හෝ ඇස් ඉදිරිපිට තරු පෙනීම (Severe headache, blurred vision)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 flex items-start gap-2">
                <span className="text-rose-600 font-bold">3.</span>
                <span>දරු චලන අඩුවීම (පැය 12 තුළ චලන 10ට අඩු වීම හෝ නැවතීම)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 flex items-start gap-2">
                <span className="text-rose-600 font-bold">4.</span>
                <span>උදරයේ තදබල කැක්කුම හෝ පපුව යට දැවිල්ල/වේදනාව (Severe epigastric pain)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 flex items-start gap-2">
                <span className="text-rose-600 font-bold">5.</span>
                <span>අධික උණ සහ වෙව්ලීම (High fever with chills)</span>
              </div>
            </div>

            <a
              href="tel:1990"
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>{t.guide.call1990Now}</span>
            </a>
          </div>
        )}
      </div>

      {/* Accordion 2: Hospital Delivery Bag Checklist */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={() => setOpenSection(openSection === 'BAG' ? ('' as any) : 'BAG')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                {t.guide.deliveryBagTitle}
              </h2>
              <p className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                {packedCount} / {totalCount} {t.guide.itemsPacked}
              </p>
            </div>
          </div>
          {openSection === 'BAG' ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {openSection === 'BAG' && (
          <div className="p-4 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 mb-2">{t.guide.deliveryBagSub}</p>

            <div className="space-y-1.5">
              {DELIVERY_BAG_ITEMS.map((item) => {
                const isChecked = Boolean(packedItems[item.id]);
                const label =
                  lang === 'si'
                    ? item.labelSi
                    : lang === 'ta'
                    ? item.labelTa
                    : item.labelEn;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-colors ${
                      isChecked
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-200'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <span className={`text-xs font-medium leading-relaxed ${isChecked ? 'line-through opacity-70' : ''}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Accordion 3: Nutrition & Daily Supplements */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={() => setOpenSection(openSection === 'NUTRITION' ? ('' as any) : 'NUTRITION')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                {t.guide.nutritionTitle}
              </h2>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                Iron, Calcium, Folate &amp; Thriposha
              </p>
            </div>
          </div>
          {openSection === 'NUTRITION' ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {openSection === 'NUTRITION' && (
          <div className="p-4 pt-0 space-y-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200">
                1. යකඩ සහ ෆෝලික් පෙති (Iron &amp; Folate)
              </div>
              <p className="text-[11px]">
                ආහාර ගැනීමෙන් පැයකට පසු විටමින් C අඩංගු දෙහි හෝ දොඩම් යුෂ සමඟ පානය කරන්න. තේ හෝ කෝපි සමඟ ගැනීමෙන් වළකින්න.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200">
                2. කැල්සියම් පෙති (Calcium Tablets)
              </div>
              <p className="text-[11px]">
                යකඩ පෙති පානය කරන වේලාවට වෙනස් වේලාවක (උදා: රාත්‍රී ආහාරයෙන් පසු) පානය කරන්න.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200">
                3. ත්‍රිපෝෂ සහ සමබල ආහාර වේලක්
              </div>
              <p className="text-[11px]">
                දිනපතා ත්‍රිපෝෂ පැකට්ටුවෙන් නියමිත ප්‍රමාණය, කොළ මැල්ලුම්, කුඩා මාළු, බිත්තර සහ නැවුම් පළතුරු ලබාගන්න.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 4: Breastfeeding & Newborn Care */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={() => setOpenSection(openSection === 'BREASTFEEDING' ? ('' as any) : 'BREASTFEEDING')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                {t.guide.breastfeedingTitle}
              </h2>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                Golden hour &amp; exclusive 6 months care
              </p>
            </div>
          </div>
          {openSection === 'BREASTFEEDING' ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {openSection === 'BREASTFEEDING' && (
          <div className="p-4 pt-0 space-y-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
              <h3 className="font-bold text-rose-900 dark:text-rose-200 mb-0.5">
                රන් පැය (The Golden Hour)
              </h3>
              <p className="text-[11px]">
                බිළිඳා උපන් මුල් පැය ඇතුළත මවගේ ළයට තබා මුල් කිරි (කොලොස්ට්‍රම්) උරා බීමට සලස්වන්න. මෙය බිළිඳාගේ පළමු ප්‍රතිශක්තිකරණ එන්නත බඳුය.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
              <h3 className="font-bold text-rose-900 dark:text-rose-200 mb-0.5">
                පළමු මාස 6 තුළ මවුකිරි පමණක්ම ලබාදීම
              </h3>
              <p className="text-[11px]">
                ජලය හෝ වෙනත් කිසිදු දියරයක් අවශ්‍ය නොවේ. බිළිඳා ඉල්ලන ඕනෑම වේලාවක මවුකිරි ලබාදෙන්න (Demand Feeding).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
