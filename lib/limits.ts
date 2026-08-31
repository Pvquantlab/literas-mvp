// Arayüz ile şemanın PAYLAŞTIĞI sayısal sınırlar.
//
// NEDEN AYRI DOSYA — konu sınırı iki yerde birbirinden habersiz yazılıydı:
// konular sayfası MAX_TOPICS = 15 ile 15 konuya kadar seçtiriyor, ekranda
// "maksimum 15 konu seçebilirsin" yazıyordu; taslakSchema ve communitySchema
// ise .max(10) diyordu. 11 konu seçen kullanıcı ilerleyemiyor, gerçek mesaj
// saveDraft'ın catch bloğunda yutulup yerine sabit "Kaydedilemedi." basılıyor
// ve kullanıcı ÇIKMAZDA kalıyordu.
//
// Bu dosya bilerek bağımlılıksız: hem istemci bileşeni hem zod şeması
// import edebilsin diye zod'a dokunmuyor.
export const MIN_TOPICS = 1
export const MAX_TOPICS = 15
