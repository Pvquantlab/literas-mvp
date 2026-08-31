// Seri gösterim yardımcıları — tek kaynak.
//
// NEDEN AYRI DOSYA — frekans etiketi iki yerde birbirinden habersiz yazılıydı
// (components/event-card.tsx ve app/event/[id]/page.tsx) ve ikisi de aynı
// sessiz yalanı söylüyordu: üçlü koşulun son dalı `: 'aylık'`, yani TANIMADIĞI
// her değere "aylık" yazıyordu. Bugün zararsız çünkü CHECK kısıtı frekansı üç
// değere kilitliyor (event_series_frekans_check); ama dördüncü bir frekans
// eklendiği gün iki ekran birden sessizce yanlış bilgi basacaktı — üstelik
// kısıtı ekleyen kişinin göreceği hiçbir hata olmadan.
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
