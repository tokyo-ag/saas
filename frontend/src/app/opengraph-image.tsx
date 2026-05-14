import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
        {/* ロゴ */}
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
          <span style={{ fontSize: 40, fontWeight: 900, color: '#06C755' }}>A</span>
        </div>

        {/* サービス名 */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          Atsumaro
        </div>

        {/* キャッチコピー */}
        <div
          style={{
            fontSize: 30,
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          コミュニティのイベント管理をLINEで完結
        </div>

        {/* 下部バッジ */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 40,
          }}
        >
          {['バドミントン', 'テニス', 'フットサル', 'ランニング', '交流会'].map((label) => (
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
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
