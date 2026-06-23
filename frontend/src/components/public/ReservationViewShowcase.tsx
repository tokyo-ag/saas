import Link from 'next/link';

const calendarDays = Array.from({ length: 14 }, (_, index) => index + 1);

function CalendarMini({ accentColor }: { accentColor: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-500">7月</span>
        <span className="h-1.5 w-6 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => (
          <span
            key={day}
            className={`flex aspect-square items-center justify-center rounded text-[9px] font-bold ${
              day === 7 || day === 12 ? 'text-white' : 'bg-white text-gray-400'
            }`}
            style={day === 7 || day === 12 ? { backgroundColor: accentColor } : undefined}
          >
            {day}
          </span>
        ))}
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

type ReservationViewShowcaseProps = {
  accentColor: string;
  buttonLabel: string;
  href?: string;
  className?: string;
  viewStyle?: string | null;
  naked?: boolean;
};

export function ReservationViewShowcase({
  accentColor,
  buttonLabel,
  href,
  className = '',
  viewStyle = 'calendar',
  naked = false,
}: ReservationViewShowcaseProps) {
  const buttonClassName =
    'inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90';
  const buttonStyle = { backgroundColor: accentColor };
  const selectedView = viewStyle === 'card' || viewStyle === 'thread' ? viewStyle : 'calendar';

  const inner = (
    <>
      {selectedView === 'calendar' && <CalendarMini accentColor={accentColor} />}
      {selectedView === 'card' && <CardMini accentColor={accentColor} />}
      {selectedView === 'thread' && <ThreadMini accentColor={accentColor} />}
    </>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {naked ? inner : (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">{inner}</div>
      )}
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
