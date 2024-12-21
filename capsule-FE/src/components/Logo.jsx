import { useApp } from '../context/AppContext';

export function Logo({ className, showText = true }) {
  const { isDarkMode } = useApp();

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      {isDarkMode ? (
        <svg
          width="24"
          height="17"
          viewBox="0 0 60 39"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="1.76471"
            y="1.76471"
            width="56.4706"
            height="35.2941"
            rx="17.6471"
            stroke="white"
            strokeWidth="3.52941"
          />
          <circle
            cx="46.7032"
            cy="19.2394"
            r="1.76471"
            fill="black"
            stroke="white"
            strokeWidth="3.52941"
          />
        </svg>
      ) : (
        <svg
          width="24"
          height="17"
          viewBox="0 0 60 39"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="1.76471"
            y="1.76471"
            width="56.4706"
            height="35.2941"
            rx="17.6471"
            stroke="black"
            strokeWidth="3.52941"
          />
          <circle
            cx="46.7032"
            cy="19.2394"
            r="1.76471"
            fill="white"
            stroke="black"
            strokeWidth="3.52941"
          />
        </svg>
      )}

      {showText && (
        <span
          style={{
            fontFamily: 'General Sans',
            fontSize: '19.206px',
            fontWeight: 500,
            letterSpacing: '-0.96px',
            lineHeight: 'normal',
            color: 'var(--text-primary)',
            fontStyle: 'normal'
          }}
        >
          Zillusion Capsule
        </span>
      )}
    </div>
  );
}
