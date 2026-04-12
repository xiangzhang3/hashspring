import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') || 'HashSpring';
  const type = searchParams.get('type') || 'article';

  const typeLabel =
    type === 'analysis' ? 'Analysis' :
    type === 'flash' ? 'Flash News' :
    'Article';

  const typeBg =
    type === 'analysis' ? '#2563eb' :
    type === 'flash' ? '#f59e0b' :
    '#0066FF';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          padding: '60px',
        }}
      >
        {/* Top: Badge + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              background: typeBg,
              color: '#fff',
              padding: '6px 18px',
              borderRadius: '20px',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
            }}
          >
            {typeLabel}
          </div>
          <div
            style={{
              color: 'rgba(148,163,184,0.8)',
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
            }}
          >
            HashSpring
          </div>
        </div>

        {/* Center: Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: title.length > 40 ? '48px' : '56px',
              fontWeight: 800,
              color: '#f1f5f9',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              maxWidth: '1000px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: URL + Decoration */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              color: 'rgba(148,163,184,0.6)',
              fontSize: '22px',
              fontWeight: 500,
            }}
          >
            hashspring.com
          </div>
          <div
            style={{
              display: 'flex',
              gap: '6px',
            }}
          >
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#0066FF' }} />
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#2563eb' }} />
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#1d4ed8' }} />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
