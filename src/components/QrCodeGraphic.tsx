import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeGraphicProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrCodeGraphic({
  value,
  size = 180,
  label = 'Scannable QR code',
}: QrCodeGraphicProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center border border-[#e2e2e2] bg-[#ffffff] text-xs font-mono-tabular text-[#5e5e5e] rounded-xl"
      >
        QR CODE
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="border border-[#000000] bg-[#ffffff] p-2 shrink-0 rounded-xl overflow-hidden"
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
