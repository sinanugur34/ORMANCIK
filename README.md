# Tiny Grove

3–10 yaş için renkli, reklama dayalı + jetonlu kozmetik + tek seferlik Premium çocuk oyunu (Expo / React Native).

Play Store ve App Store’a gidecek şekilde tasarlandı: ebeveyn kapısı, yaşa göre içerik, 80 prosedürel bölüm, yaratıcı oyun odası.

## Özellikler

- **Yaş bantları:** Ebeveyn yaş girer (3–10) → `3–5` / `6–8` / `9–10` zorluk ve şablonlar
- **80 bölüm:** 8 ada × 10 bölüm (renk eşleştir, şekil, sıra, hafıza, sayma)
- **Bölüm kilidi parayla değil:** İlk 30 açık; sonrası sırayla açılır
- **Jeton:** Bölüm ödülü + ödüllü reklam (mock) + IAP jeton paketleri (mock)
- **Kozmetik dükkan:** Kostüm, oda, dost, efekt
- **Premium (tek seferlik):** Reklamsız + tüm kozmetik + bonus jeton
- **Premium görseller:** Key art, Ken Burns hero, sinematik intro, oda arka planları, Reanimated geçişler

## Çalıştırma

```bash
npm install
npm run web          # http://127.0.0.1:43123
npm start            # Expo Go (iOS/Android)
npm run typecheck
```

## Monetizasyon (üretim)

Mock katmanlar:

- [`src/monetization/mockAds.ts`](src/monetization/mockAds.ts) → AdMob / ironSource Kids ödüllü reklam
- [`src/monetization/mockIap.ts`](src/monetization/mockIap.ts) → StoreKit 2 / Play Billing (`react-native-iap`)
- Ürün ID’leri: [`src/monetization/products.ts`](src/monetization/products.ts)

Tüm satın alma ve reklam akışları **ebeveyn kapısı** ile açılır.

## Store notları

- Apple Kids / Google Designed for Families: davranışsal hedefleme yok; ödüllü reklam + ebeveyn onayı
- Dijital içerik yalnız Apple IAP / Google Play Billing
- Bölümleri nakit ile kilitleme yok (plan kuralı)

## Stack

Expo SDK 58, TypeScript, React Navigation, Reanimated, AsyncStorage, LinearGradient.
