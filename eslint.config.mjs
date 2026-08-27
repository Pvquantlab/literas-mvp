import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * ESLint yapılandırması (flat config).
 *
 * NEDEN VAR: proje uzun süre lint'siz kaldı. package.json'daki `next lint`
 * komutu Next 16'da kaldırıldığı için çalışmıyordu ve ESLint hiç kurulu
 * değildi — koddaki `eslint-disable` yorumları da bu yüzden hiçbir şey
 * yapmıyordu. 27.08.2026 denetiminde bulundu.
 *
 * NOT: eslint-config-next 16.x kendi flat config'ini dizi olarak veriyor;
 * @eslint/eslintrc'nin FlatCompat'ı ile sarmalamak "circular structure"
 * hatası veriyor. Doğrudan yayılım (spread) doğru kullanım.
 */
export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // Service worker: tarayıcı değil worker global'leri kullanıyor,
      // Next kuralları burada anlamsız.
      'public/sw.js',
    ],
  },

  ...coreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // `any` kod tabanında yaygın (Supabase'in üretilmiş tipleri
      // kullanılmıyor). Hata yerine uyarı: tip temizliği ayrı bir iş,
      // lint'i bugünden itibaren kullanılabilir tutmak istiyoruz.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Kullanılmayan değişkenler uyarı; `_` ile başlayanlar bilinçli sayılır.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // <img> yerine next/image: bazı yerlerde bilinçli olarak <img>
      // kullanılıyor (Supabase Storage URL'leri). Uyarı yeterli.
      '@next/next/no-img-element': 'warn',

      // KAPALI — bilinçli karar.
      // Kural, JSX metnindeki düz ' ve " karakterlerini yakalıyor. Türkçe
      // metinde kesme işareti her cümlede geçiyor ("literaslab'ın",
      // "İstanbul'da"). Hepsini &apos; yapmak kaynağı okunmaz hale getirir ve
      // karşılığında hiçbir güvenlik faydası yok — kural yalnızca kapanmamış
      // tırnak yazım hatasına karşı. Türkçe-öncelikli bir arayüzde maliyeti
      // faydasından büyük.
      'react/no-unescaped-entities': 'off',

      // UYARI — bilinçli karar, gizlenmiş bir hata değil.
      // İki yerde tetikleniyor: community/new sihirbazındaki debounce'lu
      // arama efektleri (konum ve konular adımları). Efekt içinde senkron
      // setState fazladan bir render turu doğuruyor; kural teknik olarak
      // haklı. Ama arama akışları çalışıyor ve düzeltmek çalışan iki UI'ı
      // yeniden kurgulamayı gerektiriyor. Ayrı bir iş olarak bırakıldı;
      // uyarı olarak görünür kalsın ki unutulmasın.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]
