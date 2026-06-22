import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #06C755 0%, #047a35 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            background: 'white',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 900, color: '#06C755' }}>
            C
          </span>
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            marginBottom: 16,
          }}
        >
          COMIU
        </div>

        <div
          style={{
            fontSize: 30,
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
            textAlign: 'center',
            maxWidth: 820,
            lineHeight: 1.5,
          }}
        >
          東京の20代向けサークル・交流イベントをLINEで予約
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 40,
          }}
        >
          {['バドミントン', 'バスケ', 'フットサル', 'バレー', '交流会'].map(
            (label) => (
              <div
                key={label}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 600,
                  padding: '8px 20px',
                  borderRadius: 100,
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
