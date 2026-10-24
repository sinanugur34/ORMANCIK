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
- **Gizlilik / ayarlar:** Uygulama içi gizlilik politikası; yaş değişimi ebeveyn kapılı
- **Premium görseller:** Key art, Ken Burns hero, sinematik intro, oda arka planları, Reanimated geçişler

## Çalıştırma

```bash
npm install
npm run web          # http://127.0.0.1:43123
npm start            # Expo Go (iOS/Android)
npm run typecheck
```

## Monetizasyon (mock → üretim)

Bayrak: [`src/monetization/config.ts`](src/monetization/config.ts) → `USE_MOCK_MONETIZATION`

| Katman | Mock dosya | Üretim swap |
|--------|------------|-------------|
| Ödüllü reklam | [`mockAds.ts`](src/monetization/mockAds.ts) | AdMob / ironSource **Kids** SDK; `tagForChildDirectedTreatment` / under-age; yalnızca rewarded |
| IAP | [`mockIap.ts`](src/monetization/mockIap.ts) | `react-native-iap` + EAS native build; StoreKit 2 / Play Billing |
| Ürün ID’leri | [`products.ts`](src/monetization/products.ts) | App Store Connect + Play Console’da aynı ID’leri oluştur |

**Kurallar (kodda sabit):**

- Tüm satın alma, reklam ve yaş değişimi → `ParentalGate`
- Zorunlu interstitial yok
- Davranışsal hedefleme metni / ATT istemi yok
- Bölümler gerçek parayla kilitlenmez
- UI’da mock açıkken **DEMO · gerçek ödeme yok** rozeti

### AdMob / IAP bağlama adımları

1. `eas build` profili ile iOS/Android native proje üret
2. Kids uyumlu reklam SDK kur; yalnızca rewarded unit ID ekle
3. `react-native-iap` kur; `PRODUCTS.*.id` ile ürünleri çek
4. `USE_MOCK_MONETIZATION = false` yap
5. Receipt doğrulama (isteğe bağlı sunucu) + restore Purchases’ı native API’ye bağla
6. Mağaza konsollarında ürünleri **Active** yap; sandbox ile dene

## Families / Kids checklist

- [ ] Apple: Kids Category veya Age Rating + parental gates belgelendi
- [ ] Google: Designed for Families anketi; Families Policy
- [ ] Gizlilik URL’si canlı (şu an taslak: uygulama içi + `extra.privacyPolicyUrl`)
- [ ] Reklam SDK çocuk bayrakları açık; yeniden pazarlama kapalı
- [ ] IAP ürünleri oluşturuldu (`com.tinygrove.coins.*`, `com.tinygrove.premium`)
- [ ] ATT / IDFA kullanılmıyor (çocuk uygulaması)
- [ ] Ekran görüntüleri: oyun, dükkan+ebeveyn kapısı, gizlilik
- [ ] Destek e-postası gerçek adres

Ayrıntılı mağaza metni: [`STORE.md`](STORE.md)

## Gizlilik notları

- İlerleme cihazda (AsyncStorage); hesap zorunlu değil
- Konum / rehber / mikrofon izni istenmez
- Uygulama içi ekran: **Gizlilik** (`PrivacyScreen`)
- Yayın öncesi: yasal metni kesinleştir, `https://tinygrove.app/privacy` yayınla

## Stack

Expo SDK 58, TypeScript, React Navigation, Reanimated, AsyncStorage, LinearGradient.

## Bundle ID

- iOS / Android: `com.tinygrove.kids`
- Version: `1.0.0` (iOS buildNumber 1 / Android versionCode 1)
