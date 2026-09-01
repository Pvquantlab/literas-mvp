// Seri gösterim yardımcıları — tek kaynak.
//
// NEDEN AYRI DOSYA — frekans etiketi DÖRT yerde birbirinden habersiz yazılıydı
// (components/event-card.tsx, app/event/[id]/page.tsx,
// components/upcoming-events.tsx ve app/api/event/route.ts) ve dördü de aynı
// sessiz yalanı söylüyordu: üçlü koşulun son dalı `: 'aylık'`, yani TANIMADIĞI
// her değere "aylık" yazıyordu. Bugün zararsız çünkü CHECK kısıtı frekansı üç
// değere kilitliyor (event_series_frekans_check); ama dördüncü bir frekans
// eklendiği gün o ekranlar sessizce yanlış bilgi basacaktı — üstelik kısıtı
// ekleyen kişinin göreceği hiçbir hata olmadan.
//
// DÖRDÜ DE bağlandı. Duyuru mailinde (api/event/route.ts) cümle sıfatsız
// kuruluyor: "12 buluşma" — Türkçede sorunsuz bozunduğu için yedek metin
// seçmek gerekmedi.
//
// Bilinmeyen değerde null dönüyoruz: çağıran taraf frekansı YAZMAYIP yalnızca
// kalan sayısını göstersin. Eksik bilgi, yanlış bilgiden iyidir.

const ETIKET: Record<string, string> = {
  haftalik: 'haftalık',
  iki_haftalik: 'iki haftada bir',
  aylik: 'aylık',
}

/** Frekansın Türkçe etiketi. Tanınmayan değerde `null`. */
export function frekansEtiketi(frekans: string | null | undefined): string | null {
  if (!frekans) return null
  return ETIKET[frekans] ?? null
}
