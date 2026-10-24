# Ormancık — Play-first publish runbook

**Status:** Android / Play path is config-complete in-repo. **Not submitted** to Google Play or App Store. Needs Sinan’s Expo + Play Console accounts. iOS infrastructure stays ready but deferred (no Apple account required now).

Replace privacy URL / support email before public release. Mock monetization (`USE_MOCK_MONETIZATION = true`) stays on until production SDK swap — disclose or flip before public listing.

---

## Priority: Google Play (do this now)

### In-repo already verified

| Item | Value |
|------|--------|
| Display name (TR listing) | **Ormancık** |
| Display name (EN listing) | **Woodlet** |
| In-app brand | `brand.name` → Ormancık (tr) / Woodlet (en) |
| `android.package` | `com.ormancik.kids` (unchanged; do not rename to woodlet) |
| `version` / `versionCode` | `1.0.0` / `1` (EAS `production` auto-increments remote versionCode) |
| Orientation | `portrait` |
| Adaptive icon | foreground / background / monochrome present |
| Splash | `#1B7A4A` + `./assets/splash-icon.png` |
| Kids permissions | Mic / camera / location / contacts / broad storage **blocked**; `expo-av` mic permission **off** (playback only) |
| EAS Android production | `buildType: app-bundle` → **AAB** |
| EAS submit stub | track `internal`, `releaseStatus: draft`, `changesNotSentForReview: true` |
| Mock IAP flag | `src/monetization/config.ts` → `USE_MOCK_MONETIZATION = true` (DEMO badge in UI) |
| Parental gates | Purchases, ads, age change unchanged |

### Asset gaps (non-blocking for first internal track)

- Adaptive foreground / background are **512×512** (Expo accepts; optional upgrade to **1024×1024** for sharper launcher icons)
- Monochrome **432×432** (OK for Android 13+ themed icon)
- Splash / app icon **1024×1024** present
- Locale listing graphics under `assets/store/tr/` and `assets/store/en/` (icon, feature, **8× phone**, **4× 7″ tablet**, **4× 10″ tablet**)
- Shared masters still at `assets/store/play-icon-512.png` + `play-feature-1024x500.png` (prefer locale feature files for upload)
- No `extra.eas.projectId` yet — created by `eas init` after login

### AAB build & output expectations

```bash
cd /path/to/ormancik
npm install
npm run eas:login
npm run eas:init              # writes extra.eas.projectId + owner into app.json
npm run eas:configure         # optional; same as: npx eas-cli@latest build:configure
npm run play:build            # = eas build --platform android --profile production
# or explicitly:
# npx eas-cli@latest build --platform android --profile production
```

**Where the AAB lands**

1. EAS cloud build finishes → download link in terminal + [expo.dev](https://expo.dev) → project → Builds
2. Local download path (typical): `./ormancik-*.aab` or whatever path you choose when prompted / `eas build:download`
3. Artifact name pattern from EAS: `applicationId` `com.ormancik.kids`, versionName `1.0.0`, versionCode auto-bumped
4. Upload manually in Play Console → Testing → Internal testing → Create release → upload AAB  
   **or** after linking a Play service account in Expo credentials:

```bash
npm run play:submit           # = eas submit --platform android --profile production
```

Submit profile ships to **internal** track as **draft** (safe; does not send for review).

Device APK for sideload QA (not for Play):

```bash
npm run eas:build:android:preview   # profile preview → APK
```

---

## Sinan checklist — Play Console (order matters)

### 1. Accounts

- [ ] Google Play Console developer account paid / verified
- [ ] Expo account; `npm run eas:login` then `npm run eas:init`
- [ ] Link Android credentials in Expo (or let first `play:build` create a keystore managed by EAS)

### 2. Create the app

- [ ] Play Console → Create app → default/TR name **Ormancık** (EN store listing title **Woodlet**)
- [ ] Package name must match: **`com.ormancik.kids`** (set at create time; cannot change later — not woodlet)
- [ ] App / game = **Game**; free; Declarations as appropriate

### 3. Content rating

- [ ] Complete IARC questionnaire (no violence, no chat, no UGC public, IAP yes, infrequent ads)
- [ ] Target age band includes under-13 / kids

### 4. Families / Designed for Families

- [ ] Target audience & content → include children
- [ ] Designed for Families / Families Policy questionnaire
- [ ] Affirm parental gates, no behavioral ads, no chat, levels not paywalled
- [ ] Ads: child-directed / Families self-certified ad SDK when real ads ship

### 5. Data safety

- [ ] Data safety form: progress stored **on device** (AsyncStorage); no account required
- [ ] Declare IAP / ads data practices honestly once SDKs are live
- [ ] No location, contacts, mic, camera collection
- [ ] Privacy policy URL required (see §7)

### 6. Store listing (TR + EN)

| Locale | App name (Play Console) |
|--------|-------------------------|
| Turkish (tr) | **Ormancık** |
| English (en) | **Woodlet** |

Package / applicationId stays **`com.ormancik.kids`**. EN listing may optionally mention Ormancık as the original Turkish name in the short or full description.

**Title (TR):** Ormancık  
**Title (EN):** Woodlet  

**Short description TR (≤80 chars):**
```
3–10 yaş renkli orman macerası: 80 bölüm, kostümler, ebeveyn korumalı.
```

**EN short (sketch):**
```
Woodlet — ages 3–10 forest adventure (Ormancık). 80 levels, costumes, parental gates.
```

**Full description (TR)** — paste from below; add EN translation in Play Console locale (EN title Woodlet).

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
• Designed for Families uyumlu tasarım

Gizlilik: https://ormancik.app/privacy
Destek: privacy@ormancik.app
```

- [x] Graphics: TR + EN icon / feature / phone shots — see upload map below
- [ ] Category: Education and/or Casual; tags as appropriate
- [ ] Contact email + privacy URL

### Play Console graphics upload map

Package stays **`com.ormancik.kids`**. App icon is creature-only (same art both locales). Feature graphic and phone screenshots **differ by language**.

| Play Console slot | Turkish listing (**Ormancık**) | English listing (**Woodlet**) |
|-------------------|-------------------------------|-------------------------------|
| High-res icon 512×512 | `assets/store/tr/icon-512.png` | `assets/store/en/icon-512.png` |
| Feature graphic 1024×500 | `assets/store/tr/feature-1024x500.png` | `assets/store/en/feature-1024x500.png` |
| Phone 1 — cinematic | `assets/store/tr/phone-01.png` | `assets/store/en/phone-01.png` |
| Phone 2 — profile / age | `assets/store/tr/phone-02.png` | `assets/store/en/phone-02.png` |
| Phone 3 — world map | `assets/store/tr/phone-03.png` | `assets/store/en/phone-03.png` |
| Phone 4 — animalMatch | `assets/store/tr/phone-04.png` | `assets/store/en/phone-04.png` |
| Phone 5 — pathOrder | `assets/store/tr/phone-05.png` | `assets/store/en/phone-05.png` |
| Phone 6 — win / Bravo | `assets/store/tr/phone-06.png` | `assets/store/en/phone-06.png` |
| Phone 7 — play room | `assets/store/tr/phone-07.png` | `assets/store/en/phone-07.png` |
| Phone 8 — Premium | `assets/store/tr/phone-08.png` | `assets/store/en/phone-08.png` |
| 7″ tablet 1 — home | `assets/store/tr/tablet7-01.png` | `assets/store/en/tablet7-01.png` |
| 7″ tablet 2 — map | `assets/store/tr/tablet7-02.png` | `assets/store/en/tablet7-02.png` |
| 7″ tablet 3 — play room | `assets/store/tr/tablet7-03.png` | `assets/store/en/tablet7-03.png` |
| 7″ tablet 4 — Premium | `assets/store/tr/tablet7-04.png` | `assets/store/en/tablet7-04.png` |
| 10″ tablet 1–4 | `assets/store/tr/tablet10-0N.png` | `assets/store/en/tablet10-0N.png` |

Phone: **1080×1920**. Tablet7: **1920×1200** landscape. Tablet10: **2560×1600** (scaled from tablet7).

Artifact mirrors: `/opt/cursor/artifacts/store-tr/` and `store-en/`.

```bash
npm run store:screenshots -- both        # 8 phones + tablets, tr + en
npm run store:screenshots -- tr phones   # phones only
npm run store:listing-phones -- both     # draft 4-phone subset (home/map/level/room)
```

### 7. Privacy URL

- [ ] Host live policy at `https://ormancik.app/privacy` (or real domain)
- [ ] Mirror in Play Console + `app.json` → `extra.privacyPolicyUrl` / `supportEmail`

### 8. IAP (Play Billing)

| Product | ID | Type |
|---------|----|------|
| Küçük Torba | `com.ormancik.coins.small` | consumable |
| Orta Torba | `com.ormancik.coins.medium` | consumable |
| Büyük Torba | `com.ormancik.coins.large` | consumable |
| Premium | `com.ormancik.premium` | non-consumable (managed / one-time) |

- [ ] Create products in Play Console → Monetize → In-app products
- [ ] Activate; license-test account purchase before public
- [ ] **Do not** set `USE_MOCK_MONETIZATION = false` until `react-native-iap` (or equivalent) is wired

### 9. AdMob Kids (when leaving mock ads)

- [ ] AdMob app + **rewarded** unit only (no interstitial / rewarded interstitial as forced)
- [ ] Child-directed / under-age treatment; no remarketing / MAID for ads personalization
- [ ] Families Policy–compliant SDK settings
- [ ] Wire SDK then flip mock flag (production swap below)

### 10. Upload & test track

- [ ] `npm run play:build` → download AAB
- [ ] Internal testing release (draft) → add testers → smoke on device
- [ ] Closed / open testing when ready
- [ ] Production release only after mock monetization off **or** clearly demo-only / no real charges disclosed

### 11. Before public production

- [ ] Production swap checklist complete (below)
- [ ] DEMO badge gone in production UI
- [ ] Parental gates re-tested on real purchase / ad sheets
- [ ] Content rating + Data safety + Families forms green

---

## Mock monetization (current — documented for Play)

- Flag: `src/monetization/config.ts` → **`USE_MOCK_MONETIZATION = true`**
- UI badge: **DEMO · gerçek ödeme yok**
- Parental gates still required for mock buy / ad / age change
- Kids safety unchanged while mock is on
- **Play note:** Internal/closed tracks can ship mock for UX QA; **public production** should ship real Play Billing + AdMob Kids (or remove buy/ad entry points)

### Production swap checklist

1. EAS Android production AAB succeeds
2. Install Kids-compliant rewarded ad SDK; unit IDs; child-directed on
3. Install `react-native-iap` (or Expo-compatible IAP); map `PRODUCTS.*.id`
4. Set `USE_MOCK_MONETIZATION = false`
5. Wire restore purchases to Play Billing
6. Activate products in Play; license-tester purchase + restore
7. Re-test parental gates on real sheets
8. Then promote to production track / send for review

---

## Screenshots guidance (Play)

Phone: **1080×1920** — 8 shots per locale under `assets/store/{tr,en}/phone-0N.png`.  
Tablet: **1920×1200** (7″) and **2560×1600** (10″) — 4 each per locale.

1. Cinematic intro (brand hero)  
2. Profile / age warm UI  
3. World map islands  
4. animalMatch level (boosted playfield)  
5. pathOrder level  
6. Win / Bravo celebration  
7. Play room with art background  
8. Premium  

6. Tablet 7" optional later — not required for draft listing  

---

## iOS later (infrastructure ready — not blocking)

Configs kept so ASC work can start without re-architecture:

- `ios.bundleIdentifier`: **`com.ormancik.kids`**
- `ios.buildNumber`: `1`
- `eas.json` profiles: `development` (simulator), `preview`, `production` (iOS resource class)
- Submit stub: `submit.production.ios.ascAppId` = `REPLACE_AFTER_ASC_CREATE`
- Scripts: `npm run eas:build:ios` / `npm run eas:submit:ios`

**Do not require Apple Developer account for the Play launch.**  
**Do not claim “submitted to App Store” until ASC binary upload + review request.**

### When ready for App Store Connect

1. Apple Developer Program membership
2. Create app **Ormancık** (EN listing **Woodlet**), bundle ID `com.ormancik.kids`
3. Paste listing, privacy URL, age rating (IAP yes; no UGC/chat/violence)
4. Kids Category **or** age band + Review Notes documenting parental gates
5. Create same IAP product IDs; sandbox test
6. Put numeric ASC App ID into `eas.json` → `submit.production.ios.ascAppId`
7. `npm run eas:build:ios` then `npm run eas:submit:ios`

---

## npm scripts (EAS)

| Script | Command |
|--------|---------|
| `npm run eas:login` | Expo login |
| `npm run eas:init` | Create/link EAS project (`projectId`) |
| `npm run eas:configure` | `eas build:configure` (needs login) |
| `npm run play:build` | **Android production AAB** |
| `npm run play:submit` | Submit AAB to Play **internal/draft** |
| `npm run eas:build:android:preview` | Android **APK** for sideload |
| `npm run eas:build:ios` | iOS production (later) |
| `npm run eas:submit:ios` | ASC submit (later) |

`eas build:configure` **requires** Expo login — it was not run in CI/agent. Sinan runs it after `eas:login`.

---

## What still needs Sinan’s credentials

- Expo login + `eas init` (`extra.eas.projectId`)
- Play Console app create + Families / Data safety / listing
- Signing keystore (EAS-managed OK)
- Service account JSON if using `eas submit` unattended
- Hosted privacy page
- Real AdMob + Play Billing before public monetized release

**Do not claim Play or App Store submission until binaries are uploaded and review is requested in the consoles.**
