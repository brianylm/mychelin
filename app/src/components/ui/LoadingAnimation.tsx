interface LoadingAnimationProps {
  className?: string;
  size?: number;
}

export function LoadingAnimation({
  className = "",
  size = 120,
}: LoadingAnimationProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[#800020]"
      >
        <style>
          {`
            @keyframes wok-steam {
              0% { transform: translateY(0) scale(0.5); opacity: 0; }
              50% { opacity: 0.8; }
              100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
            }
            @keyframes wok-toss {
              0%, 100% { transform: rotate(0deg); }
              15% { transform: rotate(-8deg); }
              30% { transform: rotate(0deg); }
            }
            @keyframes ingredient-fly {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              50% { transform: translateY(-30px) rotate(180deg); opacity: 0.8; }
              100% { transform: translateY(0) rotate(360deg); opacity: 1; }
            }
            .steam-1 { animation: wok-steam 2s infinite ease-out; animation-delay: 0s; }
            .steam-2 { animation: wok-steam 2s infinite ease-out; animation-delay: 0.5s; }
            .steam-3 { animation: wok-steam 2s infinite ease-out; animation-delay: 1s; }
            .wok-body { animation: wok-toss 2s infinite ease-in-out; transform-origin: 100px 140px; }
            .ingredient { animation: ingredient-fly 2s infinite ease-in-out; transform-origin: center; }
            .ingredient-2 { animation: ingredient-fly 2s infinite ease-in-out 0.3s; transform-origin: center; }
            .ingredient-3 { animation: ingredient-fly 2s infinite ease-in-out 0.6s; transform-origin: center; }
          `}
        </style>

        {/* Steam wisps */}
        <circle cx="80" cy="70" r="5" className="steam-1" fill="currentColor" opacity="0.3" />
        <circle cx="110" cy="60" r="4" className="steam-2" fill="currentColor" opacity="0.3" />
        <circle cx="95" cy="75" r="6" className="steam-3" fill="currentColor" opacity="0.3" />

        <g className="wok-body">
          {/* Wok bowl — deep curved shape */}
          <path
            d="M45 110 C45 110 50 170 100 170 C150 170 155 110 155 110"
            fill="currentColor"
          />
          {/* Wok rim */}
          <ellipse cx="100" cy="110" rx="57" ry="8" fill="currentColor" />

          {/* Handle left */}
          <path
            d="M40 115 L20 125"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Handle right */}
          <path
            d="M160 115 L180 125"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Flying ingredients */}
          <circle cx="85" cy="95" r="5" fill="#ef4444" className="ingredient" /> {/* tomato/chili */}
          <circle cx="105" cy="90" r="4" fill="#22c55e" className="ingredient-2" /> {/* veggie */}
          <rect x="115" y="88" width="8" height="5" rx="1" fill="#fbbf24" className="ingredient-3" /> {/* tofu */}
        </g>

        {/* Flame underneath */}
        <ellipse cx="100" cy="175" rx="25" ry="5" fill="#f59e0b" opacity="0.6" />
        <ellipse cx="100" cy="175" rx="15" ry="3" fill="#ef4444" opacity="0.4" />
      </svg>
      <p className="mt-4 animate-pulse text-sm font-medium text-neutral-500">
        Firing up the wok...
      </p>
    </div>
  );
}
