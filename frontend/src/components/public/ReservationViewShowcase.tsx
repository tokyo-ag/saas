import Link from 'next/link';

type ReservationViewShowcaseProps = {
  accentColor: string;
  buttonLabel: string;
  href?: string;
  className?: string;
  viewStyle?: string | null;
};

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
// July 2026: starts Wednesday (index 3), 31 days, highlight some dates
const PREVIEW_MONTH = '7月';
const START_DOW = 3;
const TOTAL_DAYS = 31;
const AVAILABLE_DAYS = new Set([5, 7, 12, 19, 20, 26]);

function CalendarFull({ accentColor }: { accentColor: string }) {
  const cells: (number | null)[] = [
    ...Array(START_DOW).fill(null),
    ...Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1),
  ];
  // pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-sm font-bold text-gray-700">{PREVIEW_MONTH}</span>
        <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK_DAYS.map((d) => (
          <span key={d} className="text-[10px] font-bold text-gray-400 pb-1">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const active = AVAILABLE_DAYS.has(day);
          return (
            <span
              key={day}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active ? 'text-white' : 'text-gray-400'
              }`}
              style={active ? { backgroundColor: accentColor } : undefined}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CardMini({ accentColor }: { accentColor: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="h-12" style={{ background: `linear-gradient(135deg, ${accentColor}, #111827)` }} />
      <div className="space-y-1.5 p-2">
        <div className="h-2 w-5/6 rounded-full bg-gray-800" />
        <div className="h-1.5 w-2/3 rounded-full bg-gray-200" />
        <div className="flex gap-1">
          <span className="h-4 w-4 rounded-full bg-green-100" />
          <span className="h-4 w-4 rounded-full bg-blue-100" />
          <span className="h-4 w-4 rounded-full bg-pink-100" />
        </div>
      </div>
    </div>
  );
}

function ThreadMini({ accentColor }: { accentColor: string }) {
  return (
    <div className="space-y-1.5">
      {[17, 24, 31].map((day, index) => (
        <div key={day} className="rounded-lg border border-gray-100 bg-white px-2 py-1.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-gray-800">7/{day}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
              style={{ backgroundColor: index === 2 ? '#9CA3AF' : accentColor }}
            >
              {index === 2 ? '満席' : '募集中'}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-3/4 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export function ReservationViewShowcase({
  accentColor,
  buttonLabel,
  href,
  className = '',
  viewStyle = 'calendar',
}: ReservationViewShowcaseProps) {
  const buttonClassName =
    'inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90';
  const buttonStyle = { backgroundColor: accentColor };
  const selectedView = viewStyle === 'card' || viewStyle === 'thread' ? viewStyle : 'calendar';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        {selectedView === 'calendar' && <CalendarFull accentColor={accentColor} />}
        {selectedView === 'card' && <CardMini accentColor={accentColor} />}
        {selectedView === 'thread' && <ThreadMini accentColor={accentColor} />}
      </div>
      {href ? (
        <Link href={href} className={buttonClassName} style={buttonStyle}>
          {buttonLabel}
        </Link>
      ) : (
        <button type="button" className={buttonClassName} style={buttonStyle}>
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
