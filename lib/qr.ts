import QRCode from 'qrcode'

/**
 * Metinden inline SVG QR üretir.
 *
 * NEDEN SVG: veri-URL'li <img> yerine inline SVG her boyutta net kalır ve
 * istemciye ek JS inmez. Üretim sunucuda yapılır.
 *
 * errorCorrectionLevel 'M': telefon ekranındaki parmak izi/yansıma altında
 * okunurluk için yeterli, QR'ı gereksiz yoğunlaştırmıyor.
 */
export async function qrSvg(veri: string): Promise<string> {
  return QRCode.toString(veri, {
    type: 'svg',
    margin: 1,
    width: 220,
    errorCorrectionLevel: 'M',
  })
}
