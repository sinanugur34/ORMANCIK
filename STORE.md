# Ormancık — Store listing & publish runbook

**Status:** Build-ready configs + listing draft. **Not submitted.** Needs Sinan’s Apple Developer / Google Play / Expo accounts.

Replace contact URL/email before submit. Mock monetization remains on until production swap checklist is done.

---

## Title

**Ormancık**

## Short description (≤80 chars)

```
3–10 yaş renkli orman macerası: 80 bölüm, kostümler, ebeveyn korumalı.
```

## Full description (TR)

```
Ormancık, 3–10 yaş çocuklar için güvenli, renkli bir orman macerası.

• 80 prosedürel bölüm (renk, şekil, sıra, hafıza, sayma)
• Yaşa göre zorluk (ebeveyn yaş seçer)
• Yaratıcı oyun odası: kostüm, oda, dostlar
• Jetonlarla kozmetik; bölümler gerçek parayla kilitlenmez
• İsteğe bağlı ödüllü reklam (ebeveyn onayı)
• Tek seferlik Premium: reklamsız + tüm kozmetik

Güvenlik
• Ebeveyn kapısı: satın alma, reklam, yaş değişimi
• Zorunlu ara reklam yok
• Davranışsal reklam hedeflemesi yok
• Designed for Families / Kids Category uyumlu tasarım

Gizlilik: uygulama içi Gizlilik ekranı + https://ormancik.app/privacy
Destek: privacy@ormancik.app
```

## Keywords (ASO sketch)

`çocuk oyunu, okul öncesi, öğrenme, renkler, hafıza, kostüm, aile, güvenli, orman, Ormancık`

## Categories

- Apple: Games → Family / Kids (age band with parental gates)
- Google: Designed for Families; Education / Casual

## Age rating notes

- No violence, no chat, no user-generated public content
- In-app purchases present (parental gate on every purchase)
- Infrequent / parental-gated ads (rewarded only; no interstitial)
- No behavioral advertising / no IDFA / no ATT prompt intended

## Families / Kids checklist

- [ ] Apple: Kids Category **or** clear age rating + document parental gates in review notes
- [ ] Google: Designed for Families questionnaire; Families Policy compliance
- [ ] Host live privacy policy at `https://ormancik.app/privacy` (or your real domain); mirror in ASC + Play + `app.json` `extra.privacyPolicyUrl`
- [ ] Support email live: update `privacy@ormancik.app` if different
- [ ] AdMob (or equivalent) Kids flags: child-directed / under-age; no remarketing
- [ ] IAP products created with IDs below; sandbox tested
- [ ] Screenshots include: play, shop + parental gate, privacy/settings
- [ ] `USE_MOCK_MONETIZATION = false` only after real SDKs wired (see below)

## Product IDs (create in both stores)

| Product | ID | Type |
|---------|----|------|
| Küçük Torba | `com.ormancik.coins.small` | consumable |
| Orta Torba | `com.ormancik.coins.medium` | consumable |
| Büyük Torba | `com.ormancik.coins.large` | consumable |
| Premium | `com.ormancik.premium` | non-consumable |

Bundle / package: **`com.ormancik.kids`** (iOS + Android)

## Mock monetization (current)

- Flag: `src/monetization/config.ts` → `USE_MOCK_MONETIZATION = true`
- UI badge: **DEMO · gerçek ödeme yok**
- Parental gates still required for mock buy / ad / age change
- **Do not submit** with mock IAP/ads without disclosing; production builds should flip the flag after SDK wiring

### Production swap checklist

1. EAS native build (preview/production) succeeds
2. Install Kids-compliant rewarded ad SDK; set unit IDs; child-directed treatment on
3. Install `react-native-iap` (or Expo-compatible IAP); map `PRODUCTS.*.id`
4. Set `USE_MOCK_MONETIZATION = false`
5. Wire restore purchases to store APIs
6. Activate products in ASC + Play; sandbox purchase + restore
7. Re-test parental gates on real purchase/ad sheets
8. Then submit for review

## Screenshots guidance

Capture on a phone-sized viewport (e.g. 1290×2796 iPhone, 1080×1920 Android). Prefer Turkish UI as shipped.

1. Home + brand **Ormancık** + hero art  
2. World map islands  
3. In-level play (large targets, celebration)  
4. Play room / costume  
5. Shop with parental gate visible  
6. Privacy / settings  

Optional local captures: save under `/opt/cursor/artifacts/` as `ormancik-store-01-home.png` etc. when a computer-use session is available. Existing Tiny Grove-era demos in that folder are visual reference only — recapture after rebrand before submit.

---

## What is already done in-repo (no credentials needed)

- [x] Display name **Ormancık** in UI, web title, README, STORE
- [x] `app.json` name/slug/scheme + bundle IDs `com.ormancik.kids`
- [x] IAP IDs `com.ormancik.*`
- [x] Privacy placeholders `ormancik.app` / `privacy@ormancik.app`
- [x] AsyncStorage migrate `tiny-grove-v1` → `ormancik-v1`
- [x] `eas.json` profiles: development / preview / production + submit stubs
- [x] npm scripts: `eas:login`, `eas:init`, `eas:build:*`, `eas:submit:*`

**Not done (requires Sinan accounts):** Expo login, EAS projectId, Apple/Google signing, store app creation, binary upload, review submit.

---

## Sinan: exact next steps

### A. Expo / EAS (once)

```bash
cd /path/to/ormancik
npm install
npm run eas:login          # Expo account
npx eas-cli@latest init    # writes extra.eas.projectId + owner into app.json
```

Link Apple + Google credentials in [expo.dev](https://expo.dev) → project → Credentials (or let `eas build` prompt).

### B. App Store Connect

1. Create app: name **Ormancık**, bundle ID **`com.ormancik.kids`**
2. Paste short/full description, keywords, screenshots, privacy URL, support URL/email
3. Age rating questionnaire (IAP yes; no UGC/chat/violence)
4. Kids / parental gate notes in Review Notes
5. Create IAP products with IDs above; submit IAPs with the binary
6. Put ASC App ID into `eas.json` → `submit.production.ios.ascAppId`
7. Build + submit:

```bash
npm run eas:build:ios
npm run eas:submit:ios
```

### C. Google Play Console

1. Create app: **Ormancık**, package **`com.ormancik.kids`**
2. Designed for Families / Kids content declarations
3. Store listing (TR): title, short/full description, graphics
4. Create in-app products matching IDs above
5. Privacy policy URL; target audience & content
6. Upload AAB from production build (internal track first):

```bash
npm run eas:build:android
npm run eas:submit:android
```

### D. Privacy hosting

Publish a real policy page (content can start from in-app `PrivacyScreen`), set:

- Live URL (replace placeholder if not `https://ormancik.app/privacy`)
- `app.json` → `expo.extra.privacyPolicyUrl` + `supportEmail`
- Both store consoles

### E. Before public release

- Flip mock monetization off (production swap checklist)
- Confirm DEMO badge gone in production UI
- Smoke-test parental gates on device builds

---

## Manual console steps (summary)

1. Create apps: `com.ormancik.kids` (iOS + Android) named **Ormancık**
2. Host real privacy policy URL; set in store consoles + `app.json` extra
3. Create IAP products matching `src/monetization/products.ts` IDs
4. Set `USE_MOCK_MONETIZATION = false` after AdMob Kids + react-native-iap wired
5. `eas login` → `eas init` → `eas build` → upload / `eas submit` → rating questionnaires → submit review

**Do not claim submission until binaries are uploaded and review is requested in the consoles.**
