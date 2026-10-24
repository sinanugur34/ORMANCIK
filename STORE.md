# Tiny Grove — Store listing draft

Short copy for App Store Connect + Google Play Console. Replace contact URL/email before submit.

## Short description (80 chars)

```
3–10 yaş renkli orman macerası: 80 bölüm, kostümler, ebeveyn korumalı.
```

## Full description (TR)

```
Tiny Grove, 3–10 yaş çocuklar için güvenli, renkli bir orman macerası.

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

Gizlilik: uygulama içi Gizlilik ekranı + https://tinygrove.app/privacy
Destek: privacy@tinygrove.app
```

## Keywords (ASO sketch)

`çocuk oyunu, okul öncesi, öğrenme, renkler, hafıza, kostüm, aile, güvenli`

## Categories

- Apple: Games → Family / Kids (age 9+ or under with parental gates)
- Google: Designed for Families; Education / Casual

## Age rating notes

- No violence, no chat, no user-generated public content
- In-app purchases present (parental gate)
- Infrequent / parental-gated ads (rewarded only)

## Screenshots to capture

1. Home + hero art  
2. World map islands  
3. In-level play  
4. Play room / costume  
5. Shop with parental gate  
6. Privacy / settings  

## Manual console steps (Sinan)

1. Create apps: `com.tinygrove.kids` (iOS + Android)
2. Host real privacy policy URL; set in store consoles + `app.json` extra
3. Create IAP products matching `src/monetization/products.ts` IDs
4. Set `USE_MOCK_MONETIZATION = false` after AdMob Kids + react-native-iap wired
5. EAS Build → upload binaries → fill rating questionnaires → submit review
