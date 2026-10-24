export function BoundaryRadar() {
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-48 w-48">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#27373C" strokeWidth="2" />
        <text x="100" y="100" textAnchor="middle" fill="#E6EEEC" fontSize="12">PREMISES BOUNDARY</text>
      </svg>
    </div>
  );
}
