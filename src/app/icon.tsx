import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b1020',
          color: '#f59e0b',
          fontSize: 18,
          fontWeight: 800,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        KC
      </div>
    ),
    size
  );
}
