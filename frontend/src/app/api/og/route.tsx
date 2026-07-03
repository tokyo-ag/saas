import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') ?? 'COMIUガイド';
  const category = searchParams.get('category') ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 上部: COMIUロゴ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#06C755',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '22px',
              fontWeight: 800,
            }}
          >
            C
          </div>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>COMIU</span>
          <span style={{ fontSize: '18px', color: '#6B7280', marginLeft: '8px' }}>ガイド</span>
        </div>

        {/* 中央: タイトル */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            paddingTop: '40px',
            paddingBottom: '40px',
          }}
        >
          <div
            style={{
              fontSize: title.length > 30 ? '46px' : '56px',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
        </div>

        {/* 下部: カテゴリ + URL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {category && (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  color: '#06C755',
                  fontSize: '20px',
                  fontWeight: 700,
                  padding: '8px 20px',
                  borderRadius: '100px',
                  border: '2px solid #06C755',
                }}
              >
                {category}
              </div>
            )}
          </div>
          <span style={{ fontSize: '20px', color: '#9CA3AF' }}>comiu.link/guide</span>
        </div>

        {/* 右端の緑ライン装飾 */}
        <div
          style={{
            position: 'absolute',
            right: '0',
            top: '0',
            width: '12px',
            height: '630px',
            backgroundColor: '#06C755',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
