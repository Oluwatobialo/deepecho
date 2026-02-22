interface ConfidenceMeterProps {
  confidence: number;
  size?: number;
}

export default function ConfidenceMeter({ confidence, size = 160 }: ConfidenceMeterProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;

  // Color based on confidence level
  const getColor = () => {
    if (confidence >= 80) return 'var(--green-700)';
    if (confidence >= 60) return 'var(--blue-500)';
    return 'var(--gray-700)';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--gray-100)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-semibold" style={{ color: getColor() }}>
            {confidence}%
          </div>
          <div className="text-xs" style={{ color: 'var(--gray-700)' }}>
            AI Certainty
          </div>
        </div>
      </div>
    </div>
  );
}