'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MotherLang = 'si' | 'ta' | 'en';

export interface MotherPortalDictionary {
  brand: {
    name: string;
    sub: string;
    ministry: string;
    poweredBy: string;
  };
  nav: {
    home: string;
    kicks: string;
    baby: string;
    guide: string;
    logout: string;
    install: string;
  };
  auth: {
    joinTitle: string;
    joinSub: string;
    loginTitle: string;
    loginSub: string;
    inviteCode: string;
    invitePlaceholder: string;
    dob: string;
    dobHint: string;
    pin: string;
    pinConfirm: string;
    pinHint: string;
    activateBtn: string;
    loginBtn: string;
    demoBtn: string;
    identifierLabel: string;
    identifierPlaceholder: string;
    haveInvite: string;
    alreadyLinked: string;
    pinMismatch: string;
    invalidDob: string;
  };
  home: {
    greetingMorning: string;
    greetingAfternoon: string;
    greetingEvening: string;
    gestationTitle: string;
    weeks: string;
    days: string;
    eddLabel: string;
    trimester1: string;
    trimester2: string;
    trimester3: string;
    milestoneWeek32: string;
    upcomingTitle: string;
    nextHomeVisit: string;
    nextClinic: string;
    inDays: string;
    daysLeft: string;
    midwifeTitle: string;
    phmRole: string;
    callMidwife: string;
    emergencyCall1990: string;
    emergencySub: string;
    vitalsTitle: string;
    vitalsSub: string;
    bpNormal: string;
    weightGainGood: string;
    hbAdequate: string;
    sfhNormal: string;
  };
  kicks: {
    title: string;
    subtitle: string;
    infoPill: string;
    tapButton: string;
    elapsed: string;
    kickProgress: string;
    undo: string;
    reset: string;
    completedTitle: string;
    completedSub: string;
    worriedBtn: string;
    worriedTitle: string;
    worriedSub: string;
    historyTitle: string;
    durationLabel: string;
    notLoggedToday: string;
  };
  baby: {
    title: string;
    subtitle: string;
    unbornPreviewTitle: string;
    unbornPreviewSub: string;
    bornChildAge: string;
    birthWeight: string;
    growthChartTitle: string;
    growthChartSub: string;
    vaccineTitle: string;
    vaccineNextDue: string;
    vaccineCompleted: string;
    vaccineUpcoming: string;
  };
  guide: {
    title: string;
    subtitle: string;
    dangerSignsTitle: string;
    dangerSignsSub: string;
    nutritionTitle: string;
    nutritionSub: string;
    deliveryBagTitle: string;
    deliveryBagSub: string;
    breastfeedingTitle: string;
    breastfeedingSub: string;
    call1990Now: string;
    itemsPacked: string;
  };
}

export const MOTHER_TRANSLATIONS: Record<MotherLang, MotherPortalDictionary> = {
  si: {
    brand: {
      name: 'දරුනැලි',
      sub: 'මව් සහ බිළිඳු සහකාරි පෝර්ටලය',
      ministry: 'සෞඛ්‍ය අමාත්‍යාංශය • පවුල් සෞඛ්‍ය කාර්යාංශය',
      poweredBy: 'Powered by Bitgard Pvt Ltd',
    },
    nav: {
      home: 'මුල් පිටුව',
      kicks: 'චලන (Kicks)',
      baby: 'මගේ බිළිඳා',
      guide: 'සෞඛ්‍ය උපදෙස්',
      logout: 'ඉවත් වන්න',
      install: 'Home Screen එකට එක්කරන්න',
    },
    auth: {
      joinTitle: 'දරුනැලි මව් පෝර්ටලය සක්‍රීය කරන්න',
      joinSub: 'ඔබේ මහජන සෞඛ්‍ය පවුල් සෞඛ්‍ය සේවා නිලධාරිනිය (PHM) ලබාදුන් රහස්‍ය ආරාධනා කේතය ඇතුළත් කරන්න.',
      loginTitle: 'මව් පෝර්ටලයට පිවිසෙන්න',
      loginSub: 'ඔබේ ලියාපදිංචි දුරකථන අංකය හෝ ජාතික හැඳුනුම්පත් අංකය සහ 4-ඉලක්කම් PIN අංකය භාවිතා කරන්න.',
      inviteCode: 'ආරාධනා කේතය (Invite Code)',
      invitePlaceholder: 'උදා: DRN-74K',
      dob: 'උපන් දිනය (DD/MM/YYYY)',
      dobHint: 'සායන කාඩ්පතේ ලියාපදිංචි උපන් දිනය',
      pin: 'නව 4-ඉලක්කම් PIN අංකය',
      pinConfirm: 'PIN අංකය නැවත තහවුරු කරන්න',
      pinHint: 'ඉදිරියේදී පෝර්ටලයට පිවිසීමට මෙම PIN අංකය මතක තබාගන්න.',
      activateBtn: 'පෝර්ටලය සක්‍රීය කර පිවිසෙන්න',
      loginBtn: 'PIN මඟින් පිවිසෙන්න',
      demoBtn: '🚀 ආදර්ශ මව් පෝර්ටලය අත්හදා බලන්න (Demo Mode)',
      identifierLabel: 'දුරකථන අංකය හෝ හැඳුනුම්පත් අංකය (NIC)',
      identifierPlaceholder: 'උදා: 0771234567 හෝ 917654321V',
      haveInvite: 'මිඩ්වයිෆ් නෝනාගෙන් ලැබුණු ආරාධනා කේතයක් තිබේද? මෙතනින් සක්‍රීය කරන්න',
      alreadyLinked: 'දැනටමත් PIN සකසා ඇත්නම් මෙතනින් Login වන්න',
      pinMismatch: 'PIN අංක දෙක සමාන නොවේ.',
      invalidDob: 'කරුණාකර නිවැරදි උපන් දිනයක් ඇතුළත් කරන්න (DD/MM/YYYY).',
    },
    home: {
      greetingMorning: 'සුබ උදෑසනක්',
      greetingAfternoon: 'සුබ දහවලක්',
      greetingEvening: 'සුබ සැඳෑවක්',
      gestationTitle: 'ගර්භණී කාලය (Gestation)',
      weeks: 'සති',
      days: 'දින',
      eddLabel: 'බිළිඳා අපේක්ෂිත දිනය (EDD)',
      trimester1: 'පළමු ත්‍රෛමාසිකය (1st Trimester)',
      trimester2: 'දෙවන ත්‍රෛමාසිකය (2nd Trimester)',
      trimester3: 'තෙවන ත්‍රෛමාසිකය (3rd Trimester)',
      milestoneWeek32: 'සති 32: බිළිඳාගේ නියපොතු හොඳින් වර්ධනය වී ඇති අතර හුස්ම ගැනීමේ චලනයන් පුරුදු වෙමින් පවතී. බර ග්‍රෑම් 1,800ක් පමණ වේ!',
      upcomingTitle: 'ඉදිරි හමුවීම් සහ සත්කාර',
      nextHomeVisit: 'PHM නිවෙස් සංචාරය',
      nextClinic: 'පූර්ව ප්‍රසව සායනය',
      inDays: 'දිනකින්',
      daysLeft: 'දින',
      midwifeTitle: 'මගේ පවුල් සෞඛ්‍ය සේවා නිලධාරිනිය',
      phmRole: 'ප්‍රදේශයේ පවුල් සෞඛ්‍ය සේවා නිලධාරිනිය (PHM)',
      callMidwife: 'අමතන්න (Call PHM)',
      emergencyCall1990: 'හදිසි ගිලන්රථ 1990 අමතන්න',
      emergencySub: 'අනතුරු ඇඟවීමේ ලක්ෂණයක් ඇත්නම් වහාම රෝහල්ගත වන්න',
      vitalsTitle: 'අවසන් සායනික පරීක්ෂණ සාරාංශය',
      vitalsSub: 'මහජන සෞඛ්‍ය නිලධාරිනිය විසින් සටහන් කළ මිනුම්',
      bpNormal: 'රුධිර පීඩනය සාමාන්‍යයි',
      weightGainGood: 'සතුටුදායක බර වැඩිවීමක්',
      hbAdequate: 'ප්‍රමාණවත් රක්තහීනතා මට්ටමක්',
      sfhNormal: 'ගර්භාෂ උස සාමාන්‍යයි',
    },
    kicks: {
      title: 'දරු චලන සටහන (Cardiff Count-to-10)',
      subtitle: 'දිනපතා උදෑසන 9:00 සිට බිළිඳාගේ චලන 10ක් දැනෙන තෙක් සටහන් කරන්න.',
      infoPill: 'සති 28න් පසු දිනපතා ගණනය අත්‍යවශ්‍ය වේ',
      tapButton: 'චලනයක් දැනුණා (Tap Kick)',
      elapsed: 'ගතවූ කාලය',
      kickProgress: 'චලන ගණන',
      undo: 'අවසන් ටැප් එක ඉවත් කරන්න',
      reset: 'නැවත මුල සිට',
      completedTitle: 'සුබ පැතුම්! චලන 10 සම්පූර්ණයි 🎉',
      completedSub: 'අද දින බිළිඳා හොඳින් ක්‍රියාකාරීව සිටින බව සටහන් විය.',
      worriedBtn: 'චලන 10ක් දැනුණේ නැත / බියක් දැනේ',
      worriedTitle: 'පැය 12ක් තුළ චලන 10ක් නොදැනුණි නම් හෝ අඩුවීමක් දැනේ නම්:',
      worriedSub: 'වහාම ඔබේ පවුල් සෞඛ්‍ය නිලධාරිනිය අමතන්න හෝ ළඟම ඇති ප්‍රසව රෝහල වෙත යන්න.',
      historyTitle: 'පසුගිය දින 7 දරු චලන ඉතිහාසය',
      durationLabel: 'චලන 10ට ගත වූ කාලය',
      notLoggedToday: 'අද දින තවම චලන සටහන් කර නැත.',
    },
    baby: {
      title: 'මගේ බිළිඳා සහ එන්නත් පොත',
      subtitle: 'ළමා සෞඛ්‍ය සංවර්ධන වාර්තාව (CHDR) සහ ප්‍රතිශක්තිකරණ කාලසටහන',
      unbornPreviewTitle: 'උපතින් පසු ආරම්භ වන එන්නත් කාලසටහන',
      unbornPreviewSub: 'බිළිඳා මෙලොවට බිහිවූ විගස රෝහලේදී BCG එන්නත ලබාදෙනු ලැබේ.',
      bornChildAge: 'වයස',
      birthWeight: 'උපත් බර',
      growthChartTitle: 'වර්ධන සටහන (Weight-for-Age)',
      growthChartSub: 'ශ්‍රී ලංකා ජාතික වර්ධන ප්‍රමිතීන්ට අනුකූලව',
      vaccineTitle: 'ජාතික ප්‍රතිශක්තිකරණ වැඩසටහන (EPI)',
      vaccineNextDue: 'ඊළඟට නියමිත එන්නත',
      vaccineCompleted: 'ලබාදුන් එන්නත්',
      vaccineUpcoming: 'ඉදිරියට නියමිත එන්නත්',
    },
    guide: {
      title: 'පවුල් සෞඛ්‍ය නිල මාර්ගෝපදේශය',
      subtitle: 'ගර්භණී සහ ළමා සත්කාර සඳහා වෛද්‍ය උපදෙස්',
      dangerSignsTitle: 'අනතුරු ඇඟවීමේ ලක්ෂණ — වහාම රෝහලට යන්න!',
      dangerSignsSub: 'යෝනි මාර්ගයෙන් ලේ හෝ වතුර යාම, අධික හිසරදය, ඇස් පෙනීම බොඳවීම, දරු චලන අඩුවීම, උණ.',
      nutritionTitle: 'පෝෂණය සහ ඖෂධ පෙති',
      nutritionSub: 'යකඩ සහ ෆෝලික් අම්ලය, කැල්සියම්, ත්‍රිපෝෂ සහ පෝෂ්‍යදායී සමබල ආහාර වේලක්.',
      deliveryBagTitle: 'ප්‍රසූතිය සඳහා සූදානම් කරගත යුතු බෑගය',
      deliveryBagSub: 'H-512 කාඩ්පත, හැඳුනුම්පත, මවට සහ බිළිඳාට අවශ්‍ය ඇඳුම් සහ පිරිසිදු කිරීමේ ද්‍රව්‍ය.',
      breastfeedingTitle: 'මවුකිරි ලබාදීම සහ අලුත උපන් බිළිඳු සත්කාරය',
      breastfeedingSub: 'උපතින් පැයක් ඇතුළත මුල් කිරි ලබාදීම සහ මාස 6ක් යනතුරු මවුකිරි පමණක් ලබාදීම.',
      call1990Now: '1990 ගිලන්රථ සේවාව අමතන්න',
      itemsPacked: 'බඩු ලැයිස්තුව සම්පූර්ණයි',
    },
  },
  ta: {
    brand: {
      name: 'தருநெலி',
      sub: 'தாய் சேய் நல்வாழ்வு போர்ட்டல்',
      ministry: 'சுகாதார அமைச்சு • குடும்ப சுகாதாரப் பணியகம்',
      poweredBy: 'Powered by Bitgard Pvt Ltd',
    },
    nav: {
      home: 'முகப்பு',
      kicks: 'அசைவுகள் (Kicks)',
      baby: 'என் குழந்தை',
      guide: 'வழிகாட்டி',
      logout: 'வெளியேறு',
      install: 'Home Screen இல் சேர்க்க',
    },
    auth: {
      joinTitle: 'தருநெலி தாய் போர்ட்டலை செயல்படுத்துக',
      joinSub: 'உங்கள் பொது சுகாதார குடும்ப நல உத்தியோகத்தர் (PHM) வழங்கிய அழைப்புக் குறியீட்டை உள்ளிடவும்.',
      loginTitle: 'தாய் போர்ட்டலில் உள்நுழைக',
      loginSub: 'பதிவுசெய்யப்பட்ட தொலைபேசி எண் அல்லது தேசிய அடையாள அட்டை (NIC) மற்றும் 4 இலக்க PIN ஐப் பயன்படுத்தவும்.',
      inviteCode: 'அழைப்புக் குறியீடு (Invite Code)',
      invitePlaceholder: 'எ.கா: DRN-74K',
      dob: 'பிறந்த தேதி (DD/MM/YYYY)',
      dobHint: 'கிளினிக் அட்டையில் பதிவுசெய்யப்பட்ட பிறந்த தேதி',
      pin: 'புதிய 4 இலக்க PIN',
      pinConfirm: 'PIN ஐ மீண்டும் உறுதிப்படுத்துக',
      pinHint: 'எதிர்காலத்தில் உள்நுழைய இந்த PIN ஐ நினைவில் வைத்திருங்கள்.',
      activateBtn: 'போர்ட்டலைச் செயல்படுத்தி நுழைக',
      loginBtn: 'PIN மூலம் உள்நுழைக',
      demoBtn: '🚀 மாதிரி தாய் போர்ட்டலை சோதிக்க (Demo Mode)',
      identifierLabel: 'தொலைபேசி எண் அல்லது NIC',
      identifierPlaceholder: 'எ.கா: 0771234567 அல்லது 917654321V',
      haveInvite: 'குடும்ப நல உத்தியோகத்தரிடம் அழைப்புக் குறியீடு உள்ளதா? இங்கே செயல்படுத்துக',
      alreadyLinked: 'ஏற்கனவே PIN உள்ளதா? இங்கே உள்நுழைக',
      pinMismatch: 'PIN குறியீடுகள் பொருந்தவில்லை.',
      invalidDob: 'சரியான பிறந்த தேதியை உள்ளிடவும் (DD/MM/YYYY).',
    },
    home: {
      greetingMorning: 'காலை வணக்கம்',
      greetingAfternoon: 'மதிய வணக்கம்',
      greetingEvening: 'மாலை வணக்கம்',
      gestationTitle: 'கர்ப்ப காலம் (Gestation)',
      weeks: 'வாரங்கள்',
      days: 'நாட்கள்',
      eddLabel: 'எதிர்பார்க்கப்படும் பிரசவ தேதி (EDD)',
      trimester1: 'முதலாம் முப்பருவம் (1st Trimester)',
      trimester2: 'இரண்டாம் முப்பருவம் (2nd Trimester)',
      trimester3: 'மூன்றாம் முப்பருவம் (3rd Trimester)',
      milestoneWeek32: 'வாரம் 32: குழந்தையின் நகங்கள் வளர்ந்துள்ளன, சுவாச அசைவுகள் பயிற்சி பெறுகின்றன. எடை சுமார் 1,800 கிராம்கள்!',
      upcomingTitle: 'வரவிருக்கும் மருத்துவ சந்திப்புகள்',
      nextHomeVisit: 'PHM இல்லப் பார்வை',
      nextClinic: 'மகப்பேற்றுக்கு முந்தைய கிளினிக்',
      inDays: 'நாட்களில்',
      daysLeft: 'நாட்கள்',
      midwifeTitle: 'எனது குடும்ப சுகாதார உத்தியோகத்தர்',
      phmRole: 'பகுதி பொது சுகாதார குடும்ப நல உத்தியோகத்தர் (PHM)',
      callMidwife: 'அழைக்க (Call PHM)',
      emergencyCall1990: 'அவசர ஆம்புலன்ஸ் 1990 அழைக்க',
      emergencySub: 'எச்சரிக்கை அறிகுறிகள் தென்பட்டால் உடனடியாக மருத்துவமனைக்கு செல்லவும்',
      vitalsTitle: 'சமீபத்திய மருத்துவ பரிசோதனை',
      vitalsSub: 'PHM உத்தியோகத்தர் பதிவுசெய்த அளவீடுகள்',
      bpNormal: 'இரத்த அழுத்தம் இயல்பானது',
      weightGainGood: 'ஆரோக்கியமான எடை அதிகரிப்பு',
      hbAdequate: 'போதுமான ஹீமோகுளோபின் அளவு',
      sfhNormal: 'கருப்பை வளர்ச்சி இயல்பானது',
    },
    kicks: {
      title: 'குழந்தையின் அசைவுப் பதிவு (Cardiff 10 Kicks)',
      subtitle: 'தினமும் காலை 9:00 மணி முதல் குழந்தையின் 10 அசைவுகளைக் கணக்கிடுங்கள்.',
      infoPill: '28 வாரங்களுக்குப் பிறகு தினமும் கணக்கிடுவது அவசியம்',
      tapButton: 'அசைவு தெரிந்தது (Tap Kick)',
      elapsed: 'கடந்த நேரம்',
      kickProgress: 'அசைவுகள் எண்ணிக்கை',
      undo: 'கடைசி அசைவை நீக்கு',
      reset: 'மீண்டும் தொடங்க',
      completedTitle: 'வாழ்த்துகள்! 10 அசைவுகள் நிறைவு 🎉',
      completedSub: 'இன்று உங்கள் குழந்தை சுறுசுறுப்பாக இருப்பது பதிவானது.',
      worriedBtn: '10 அசைவுகள் இல்லை / பயமாக உள்ளது',
      worriedTitle: '12 மணி நேரத்தில் 10 அசைவுகள் குறைவாக இருந்தால்:',
      worriedSub: 'உடனடியாக உங்கள் PHM ஐ தொடர்பு கொள்ளவும் அல்லது அருகிலுள்ள மருத்துவமனைக்கு செல்லவும்.',
      historyTitle: 'கடந்த 7 நாட்கள் அசைவு வரலாறு',
      durationLabel: '10 அசைவுகளுக்கு எடுத்த நேரம்',
      notLoggedToday: 'இன்று இன்னும் அசைவுகள் பதியப்படவில்லை.',
    },
    baby: {
      title: 'என் குழந்தை & தடுப்பூசி அட்டை',
      subtitle: 'குழந்தை சுகாதார வளர்ச்சி அறிக்கை (CHDR) & தடுப்பூசி அட்டவணை',
      unbornPreviewTitle: 'பிறந்தவுடன் தொடங்கும் தடுப்பூசிகள்',
      unbornPreviewSub: 'குழந்தை பிறந்த உடனேயே மருத்துவமனையில் BCG தடுப்பூசி வழங்கப்படும்.',
      bornChildAge: 'வயது',
      birthWeight: 'பிறப்பு எடை',
      growthChartTitle: 'வளர்ச்சி வரைபடம் (Weight-for-Age)',
      growthChartSub: 'இலங்கை தேசிய வளர்ச்சி வழிகாட்டுதலின்படி',
      vaccineTitle: 'தேசிய தடுப்பூசி திட்டம் (EPI)',
      vaccineNextDue: 'அடுத்த தடுப்பூசி',
      vaccineCompleted: 'வழங்கப்பட்ட தடுப்பூசிகள்',
      vaccineUpcoming: 'வரவிருக்கும் தடுப்பூசிகள்',
    },
    guide: {
      title: 'குடும்ப சுகாதார உத்தியோகபூர்வ வழிகாட்டி',
      subtitle: 'கர்ப்பம் மற்றும் குழந்தை பராமரிப்பு மருத்துவ ஆலோசனைகள்',
      dangerSignsTitle: 'ஆபத்து அறிகுறிகள் — உடனே மருத்துவமனை செல்லவும்!',
      dangerSignsSub: 'இரத்தப்போக்கு, கடுமையான தலைவலி, பார்வை மங்குதல், அசைவு குறைதல், காய்ச்சல்.',
      nutritionTitle: 'ஊட்டச்சத்து & மருத்துவ மாத்திரைகள்',
      nutritionSub: 'இரும்பு, ஃபோலிக் அமிலம், கால்சியம், திரிபோஷா மற்றும் சத்தான உணவுகள்.',
      deliveryBagTitle: 'பிரசவத்திற்காக தயார் செய்ய வேண்டிய பை',
      deliveryBagSub: 'H-512 அட்டை, அடையாள அட்டை, தாய் மற்றும் குழந்தைக்கு தேவையான உடைகள்.',
      breastfeedingTitle: 'தாய்ப்பாலூட்டல் & பச்சிளங்குழந்தை பராமரிப்பு',
      breastfeedingSub: 'பிறந்த ஒரு மணி நேரத்திற்குள் தாய்ப்பால் தொடங்குதல் மற்றும் 6 மாதங்கள் வரை தாய்ப்பால் மட்டுமே.',
      call1990Now: '1990 ஆம்புலன்ஸ் சேவைக்கு அழைக்க',
      itemsPacked: 'பொருட்கள் தயாராக உள்ளன',
    },
  },
  en: {
    brand: {
      name: 'Daruneli',
      sub: 'Mother Companion Portal',
      ministry: 'Ministry of Health • Family Health Bureau',
      poweredBy: 'Powered by Bitgard Pvt Ltd',
    },
    nav: {
      home: 'Home',
      kicks: 'Kicks',
      baby: 'My Baby',
      guide: 'Health Guide',
      logout: 'Sign Out',
      install: 'Add to Home Screen',
    },
    auth: {
      joinTitle: 'Activate Daruneli Mother Portal',
      joinSub: 'Enter the confidential invite code provided by your Public Health Midwife (PHM).',
      loginTitle: 'Sign In to Mother Portal',
      loginSub: 'Use your registered Phone Number or NIC and 4-digit security PIN.',
      inviteCode: 'Invite Code',
      invitePlaceholder: 'e.g. DRN-74K',
      dob: 'Date of Birth (DD/MM/YYYY)',
      dobHint: 'Birth date as registered in clinic records',
      pin: 'Set 4-Digit Security PIN',
      pinConfirm: 'Confirm 4-Digit PIN',
      pinHint: 'Remember this PIN for signing in securely in the future.',
      activateBtn: 'Activate & Enter Portal',
      loginBtn: 'Sign In with PIN',
      demoBtn: '🚀 Try Demo Mother Portal (Maharagama MOH)',
      identifierLabel: 'Phone Number or NIC',
      identifierPlaceholder: 'e.g. 0771234567 or 917654321V',
      haveInvite: 'Have an invite code from your midwife? Activate here',
      alreadyLinked: 'Already have a PIN? Sign in here',
      pinMismatch: 'PINs do not match. Please verify.',
      invalidDob: 'Please enter a valid Date of Birth (DD/MM/YYYY).',
    },
    home: {
      greetingMorning: 'Good morning',
      greetingAfternoon: 'Good afternoon',
      greetingEvening: 'Good evening',
      gestationTitle: 'Pregnancy Progress',
      weeks: 'weeks',
      days: 'days',
      eddLabel: 'Expected Delivery Date (EDD)',
      trimester1: '1st Trimester',
      trimester2: '2nd Trimester',
      trimester3: '3rd Trimester',
      milestoneWeek32: 'Week 32: Baby has soft fingernails and is practicing breathing movements. Baby weighs about 1.8 kg (4 lbs)!',
      upcomingTitle: 'Upcoming Care & Visits',
      nextHomeVisit: 'PHM Domiciliary Home Visit',
      nextClinic: 'Antenatal Field Clinic',
      inDays: 'In',
      daysLeft: 'days',
      midwifeTitle: 'My Public Health Midwife',
      phmRole: 'Area Public Health Midwife (PHM)',
      callMidwife: 'Call My PHM',
      emergencyCall1990: 'Call 1990 Emergency Ambulance',
      emergencySub: 'If experiencing danger signs, seek hospital care immediately',
      vitalsTitle: 'Latest Clinical Checkup Snapshot',
      vitalsSub: 'Measurements recorded by your Public Health Midwife',
      bpNormal: 'Normal Blood Pressure',
      weightGainGood: 'Healthy Weight Progression',
      hbAdequate: 'Adequate Hemoglobin Level',
      sfhNormal: 'Normal Uterine Growth (SFH)',
    },
    kicks: {
      title: 'Cardiff Fetal Kick Counter',
      subtitle: 'Count until baby reaches 10 kicks starting from 9:00 AM daily.',
      infoPill: 'Recommended daily from 28 weeks onwards',
      tapButton: 'Tap When Baby Kicks',
      elapsed: 'Elapsed Time',
      kickProgress: 'Kick Count',
      undo: 'Undo Last Tap',
      reset: 'Reset Today',
      completedTitle: 'Great Job! 10 Kicks Reached 🎉',
      completedSub: 'Your baby has completed their daily activity goal.',
      worriedBtn: 'Fewer than 10 Kicks / Worried',
      worriedTitle: 'If baby has kicked fewer than 10 times in 12 hours:',
      worriedSub: 'Contact your midwife immediately or go to the nearest maternity hospital triage.',
      historyTitle: 'Recent 7-Day Kick History',
      durationLabel: 'Time to 10 kicks',
      notLoggedToday: 'No kick sessions logged for today yet.',
    },
    baby: {
      title: 'My Baby & Immunization Book',
      subtitle: 'Digital Child Health Development Record (CHDR) & EPI Immunization Roadmap',
      unbornPreviewTitle: 'Newborn Vaccine Roadmap (From Birth)',
      unbornPreviewSub: 'Immediately after birth at the hospital, your newborn will receive the BCG vaccine.',
      bornChildAge: 'Age',
      birthWeight: 'Birth Weight',
      growthChartTitle: 'Child Growth Progression (Weight-for-Age)',
      growthChartSub: 'Benchmarked against Sri Lanka National CHDR standards',
      vaccineTitle: 'EPI National Immunization Schedule',
      vaccineNextDue: 'Next Due Vaccine',
      vaccineCompleted: 'Vaccines Received',
      vaccineUpcoming: 'Upcoming Milestones',
    },
    guide: {
      title: 'FHB Official Maternal Health Guide',
      subtitle: 'Clinical advice from the Family Health Bureau, Ministry of Health Sri Lanka',
      dangerSignsTitle: 'Danger Signs — Go to Hospital Immediately!',
      dangerSignsSub: 'Vaginal bleeding, severe headache, blurred vision, reduced baby kicks, water leakage, or high fever.',
      nutritionTitle: 'Pregnancy Nutrition & Daily Supplements',
      nutritionSub: 'Take Iron/Folate and Calcium daily with meals. Include Thriposha and green leafy vegetables.',
      deliveryBagTitle: 'Hospital Delivery Bag Checklist',
      deliveryBagSub: 'H-512 Clinic Card, Mother NIC, mother hospital garments, newborn clothes, baby blankets & diapers.',
      breastfeedingTitle: 'Breastfeeding & Newborn Care',
      breastfeedingSub: 'Initiate breastfeeding within the first hour of birth. Exclusive breastfeeding for the first 6 months.',
      call1990Now: 'Call 1990 Ambulance Service',
      itemsPacked: 'Items Checked & Packed',
    },
  },
};

interface MotherPortalContextType {
  lang: MotherLang;
  setLang: (l: MotherLang) => void;
  t: MotherPortalDictionary;
}

const MotherPortalContext = createContext<MotherPortalContextType>({
  lang: 'si',
  setLang: () => {},
  t: MOTHER_TRANSLATIONS.si,
});

export const MotherPortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<MotherLang>('si');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daruneli_mother_lang') as MotherLang;
      if (saved && (saved === 'si' || saved === 'ta' || saved === 'en')) {
        setLangState(saved);
      }
    }
  }, []);

  const setLang = (next: MotherLang) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daruneli_mother_lang', next);
    }
  };

  return (
    <MotherPortalContext.Provider value={{ lang, setLang, t: MOTHER_TRANSLATIONS[lang] }}>
      {children}
    </MotherPortalContext.Provider>
  );
};

export const useMotherPortal = () => useContext(MotherPortalContext);
