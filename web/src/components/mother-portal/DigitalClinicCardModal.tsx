'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useMotherPortal } from '@/lib/motherPortalI18n';

interface DigitalClinicCardModalProps {
  mother: {
    fullName: string;
    nic: string;
    qrToken: string;
    bloodGroup: string;
    phmAreaName: string;
    mohDivision: string;
  };
  pogText: string;
}

export function DigitalClinicCardModal({ mother, pogText }: DigitalClinicCardModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const { lang } = useMotherPortal();

  const qrToken = mother.qrToken || 'MOTH-887654322V';

  useEffect(() => {
    if (qrToken) {
      QRCode.toDataURL(qrToken, {
        margin: 1,
        width: 260,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate clinic QR data URL:', err));
    }
  }, [qrToken]);

  // Localized texts
  const titles = {
    si: {
      button: 'මගේ සායනික QR කාඩ්පත (Digital Clinic Pass)',
      buttonSub: 'සායනයේදී හෝ නිවෙස් සංචාරයේදී PHM නිලධාරිනියට පෙන්වන්න',
      modalTitle: 'ඩිජිටල් සායනික හැඳුනුම්පත',
      modalSub: 'පවුල් සෞඛ්‍ය සේවා නිලධාරිනියගේ (PHM) ඇප් එකෙන් මෙය ස්කෑන් කළ හැක',
      scanInstruction: 'භෞතික සායනික පොත (H512) නොමැති වුවද මෙම QR කේතය ස්කෑන් කර PHM නිලධාරිනියට ඔබගේ සායනික වාර්තාවට පිවිසිය හැක.',
      bloodGroup: 'රුධිර ඝනය',
      nic: 'ජා.හැ. අංකය',
      pog: 'ගර්භණී කාලය',
      area: 'ප්‍රදේශය',
      close: 'වසන්න',
    },
    ta: {
      button: 'எனது மருத்துவமனை QR அட்டை (Digital Clinic Pass)',
      buttonSub: 'மருத்துவமனை அல்லது இல்லப் பார்வையின் போது PHM உத்தியோகத்தரிடம் காட்டவும்',
      modalTitle: 'டிஜிட்டல் மருத்துவ அடையாள அட்டை',
      modalSub: 'PHM உத்தியோகத்தர் தனது செயலியில் இதனை ஸ்கேன் செய்ய முடியும்',
      scanInstruction: 'மருத்துவப் புத்தகம் இல்லாதபோதும், இந்த QR குறியீட்டை ஸ்கேன் செய்து உங்கள் மருத்துவ விபரங்களை அணுகலாம்.',
      bloodGroup: 'இரத்த வகை',
      nic: 'தேசிய அடையாள அட்டை',
      pog: 'கர்ப்ப காலம்',
      area: 'பகுதி',
      close: 'மூடுக',
    },
    en: {
      button: 'My Digital Clinic QR Pass',
      buttonSub: 'Show to Midwife during clinic checkups & home visits',
      modalTitle: 'Digital Clinic Identity Pass',
      modalSub: 'Scannable by your Public Health Midwife (PHM) mobile app',
      scanInstruction: 'Even without the physical clinic record book (H512), your Midwife can scan this QR code to instantly access your complete profile.',
      bloodGroup: 'Blood Group',
      nic: 'NIC No',
      pog: 'Gestation',
      area: 'Area',
      close: 'Close',
    },
  }[lang];

  return (
    <>
      {/* 1. Quick Access Card on Home Screen */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-left bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 hover:from-teal-500/15 hover:to-emerald-500/15 border border-teal-500/30 rounded-2xl p-4 flex items-center justify-between transition-all shadow-sm active:scale-[0.99] group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {titles.button}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
                H512 Pass
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {titles.buttonSub}
            </p>
          </div>
        </div>
        <div className="text-teal-600 dark:text-teal-400 font-bold text-xs bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-700/50 px-2.5 py-1 rounded-lg shadow-xs group-hover:bg-teal-50 dark:group-hover:bg-gray-700 transition-colors">
          View QR
        </div>
      </button>

      {/* 2. Full Screen High-Contrast Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with National Emblem */}
            <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-teal-900 text-white p-5 text-center relative">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label={titles.close}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-center mb-2">
                <Image
                  src="/images/sri-lanka-emblem.png"
                  alt="Sri Lanka Government"
                  width={34}
                  height={44}
                  className="drop-shadow"
                />
              </div>

              <h3 className="font-extrabold text-base tracking-tight">
                {titles.modalTitle}
              </h3>
              <p className="text-xs text-teal-200/90 mt-0.5">
                {titles.modalSub}
              </p>
            </div>

            {/* QR Code Container (Pure white background for maximum camera contrast) */}
            <div className="p-6 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl shadow-inner border border-gray-200 flex items-center justify-center min-w-[220px] min-h-[220px]">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Clinic QR ${qrToken}`}
                    width={220}
                    height={220}
                    className="max-w-[220px] max-h-[220px] w-full h-auto block"
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-xs">
                    Generating QR code...
                  </div>
                )}
              </div>

              {/* Scannable Token Badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 font-mono font-bold text-xs">
                <span>{qrToken}</span>
              </div>

              {/* Mother Details Card */}
              <div className="w-full mt-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-xs space-y-1.5 border border-gray-100 dark:border-gray-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Mother:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{mother.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">{titles.nic}:</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{mother.nic}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">{titles.pog}:</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-400">{pogText}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">{titles.bloodGroup}:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{mother.bloodGroup}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">{titles.area}:</span>
                  <span className="text-gray-700 dark:text-gray-300">{mother.phmAreaName}</span>
                </div>
              </div>

              {/* Guidance Note */}
              <div className="mt-3.5 flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                <p>{titles.scanInstruction}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 text-white dark:text-gray-900 text-xs font-bold transition-colors"
              >
                {titles.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
