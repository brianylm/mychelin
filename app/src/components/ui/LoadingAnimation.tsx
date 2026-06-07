interface LoadingAnimationProps {
  className?: string;
  size?: number;
  label?: string;
  variant?: "ignition" | "hei-burst";
}

export function LoadingAnimation({
  className = "",
  size = 120,
  label,
  variant = "ignition",
}: LoadingAnimationProps) {
  const isHeiBurst = variant === "hei-burst";
  const loadingLabel = label ?? (isHeiBurst ? "Finding wok hei..." : "Firing up the wok...");

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} aria-live="polite">
      {isHeiBurst ? <HeiBurstWok size={size} /> : <WokIgnition size={size} />}
      <p className="mt-4 text-sm font-medium text-neutral-500">
        {loadingLabel}
      </p>
    </div>
  );
}

function WokIgnition({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Wok heating over a flame"
    >
      <style>
        {`
          @keyframes ignition-flame-core {
            0%, 100% { transform: scaleY(0.82) translateY(4px); opacity: 0.68; }
            35% { transform: scaleY(1.08) translateY(-2px); opacity: 1; }
            70% { transform: scaleY(0.94) translateY(1px); opacity: 0.84; }
          }
          @keyframes ignition-flame-blue {
            0%, 100% { transform: scaleX(0.84); opacity: 0.62; }
            45% { transform: scaleX(1.08); opacity: 0.95; }
          }
          @keyframes ignition-heat {
            0% { transform: translateY(18px) scaleX(0.72); opacity: 0; }
            35% { opacity: 0.52; }
            100% { transform: translateY(-34px) scaleX(1.08); opacity: 0; }
          }
          @keyframes ignition-oil {
            0%, 100% { transform: rotate(-8deg) scaleX(0.78); opacity: 0.28; }
            45% { transform: rotate(7deg) scaleX(1.04); opacity: 0.72; }
          }
          @keyframes ignition-wok {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-1.5px); }
          }
          .ignition-wok { animation: ignition-wok 2.8s infinite ease-in-out; transform-origin: 100px 142px; }
          .ignition-oil { animation: ignition-oil 2.4s infinite ease-in-out; transform-origin: 100px 107px; }
          .ignition-heat-1 { animation: ignition-heat 2.2s infinite ease-out; transform-origin: center; }
          .ignition-heat-2 { animation: ignition-heat 2.2s infinite ease-out 0.55s; transform-origin: center; }
          .ignition-heat-3 { animation: ignition-heat 2.2s infinite ease-out 1.1s; transform-origin: center; }
          .ignition-flame-core { animation: ignition-flame-core 1.05s infinite ease-in-out; transform-origin: 100px 162px; }
          .ignition-flame-blue { animation: ignition-flame-blue 1.2s infinite ease-in-out; transform-origin: 100px 170px; }
        `}
      </style>

      <g className="ignition-heat-1" opacity="0.55">
        <path d="M78 83 C66 65 92 58 80 39" stroke="#800020" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className="ignition-heat-2" opacity="0.45">
        <path d="M102 84 C92 67 116 59 105 42" stroke="#C47A32" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className="ignition-heat-3" opacity="0.42">
        <path d="M125 86 C113 68 139 62 127 45" stroke="#800020" strokeWidth="5" strokeLinecap="round" />
      </g>

      <g className="ignition-wok">
        <path d="M43 111 C48 151 71 171 100 171 C129 171 152 151 157 111" fill="currentColor" />
        <ellipse cx="100" cy="111" rx="59" ry="10" fill="currentColor" />
        <ellipse cx="100" cy="106" rx="48" ry="5.5" fill="#fff7ee" opacity="0.3" />
        <ellipse className="ignition-oil" cx="100" cy="107" rx="28" ry="4" fill="#F2B66D" opacity="0.5" />
        <path d="M40 116 L20 126" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M160 116 L180 126" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="179" rx="33" ry="6" fill="#17131f" opacity="0.12" />
      <ellipse className="ignition-flame-blue" cx="100" cy="170" rx="27" ry="8" fill="#2F80ED" opacity="0.72" />
      <path className="ignition-flame-core" d="M100 138 C116 154 116 174 100 181 C84 174 84 154 100 138Z" fill="#F97316" />
      <path className="ignition-flame-core" d="M100 151 C108 160 108 174 100 178 C92 174 92 160 100 151Z" fill="#FDE68A" opacity="0.92" />
    </svg>
  );
}

function HeiBurstWok({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Wok tossing ingredients over a flame"
    >
      <style>
        {`
          @keyframes hei-wok-toss {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            18% { transform: rotate(-9deg) translateY(-3px); }
            34% { transform: rotate(4deg) translateY(1px); }
            48% { transform: rotate(0deg) translateY(0); }
          }
          @keyframes hei-ingredient-a {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.95; }
            28% { transform: translate(-18px, -48px) rotate(140deg); opacity: 1; }
            52% { transform: translate(2px, -12px) rotate(250deg); opacity: 0.86; }
          }
          @keyframes hei-ingredient-b {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.95; }
            26% { transform: translate(12px, -54px) rotate(-120deg); opacity: 1; }
            54% { transform: translate(-3px, -10px) rotate(-220deg); opacity: 0.86; }
          }
          @keyframes hei-ingredient-c {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.95; }
            30% { transform: translate(26px, -40px) rotate(180deg); opacity: 1; }
            54% { transform: translate(4px, -8px) rotate(310deg); opacity: 0.86; }
          }
          @keyframes hei-flare {
            0%, 100% { transform: scale(0.72); opacity: 0.18; }
            20% { transform: scale(1.18); opacity: 0.82; }
            44% { transform: scale(0.9); opacity: 0.28; }
          }
          @keyframes hei-spark {
            0%, 100% { transform: translateY(0) scale(0.5); opacity: 0; }
            24% { transform: translateY(-18px) scale(1); opacity: 0.95; }
            52% { transform: translateY(-32px) scale(0.7); opacity: 0; }
          }
          .hei-wok { animation: hei-wok-toss 1.8s infinite cubic-bezier(.2,.8,.2,1); transform-origin: 100px 137px; }
          .hei-a { animation: hei-ingredient-a 1.8s infinite cubic-bezier(.2,.8,.2,1); transform-origin: center; }
          .hei-b { animation: hei-ingredient-b 1.8s infinite cubic-bezier(.2,.8,.2,1); transform-origin: center; }
          .hei-c { animation: hei-ingredient-c 1.8s infinite cubic-bezier(.2,.8,.2,1); transform-origin: center; }
          .hei-flare { animation: hei-flare 1.8s infinite ease-in-out; transform-origin: 100px 155px; }
          .hei-spark-1 { animation: hei-spark 1.8s infinite ease-out 0.08s; transform-origin: center; }
          .hei-spark-2 { animation: hei-spark 1.8s infinite ease-out 0.24s; transform-origin: center; }
          .hei-spark-3 { animation: hei-spark 1.8s infinite ease-out 0.36s; transform-origin: center; }
        `}
      </style>

      <path className="hei-flare" d="M61 151 C74 127 90 141 99 113 C109 139 131 126 141 151 C133 176 73 176 61 151Z" fill="#F97316" opacity="0.55" />
      <path className="hei-flare" d="M83 158 C91 143 99 148 103 132 C111 149 121 143 126 158 C120 173 91 173 83 158Z" fill="#FDE68A" opacity="0.8" />

      <g className="hei-a">
        <circle cx="80" cy="96" r="5" fill="#D9480F" />
      </g>
      <g className="hei-b">
        <path d="M104 91 L114 96 L105 103 L96 98Z" fill="#2F9E44" />
      </g>
      <g className="hei-c">
        <rect x="119" y="96" width="10" height="7" rx="2" fill="#F2B66D" />
      </g>
      <circle className="hei-spark-1" cx="68" cy="123" r="3" fill="#FDE68A" />
      <circle className="hei-spark-2" cx="134" cy="119" r="2.5" fill="#F97316" />
      <circle className="hei-spark-3" cx="106" cy="105" r="2.5" fill="#FDE68A" />

      <g className="hei-wok">
        <path d="M43 116 C49 154 72 170 100 170 C128 170 151 154 157 116" fill="currentColor" />
        <ellipse cx="100" cy="116" rx="60" ry="10" fill="currentColor" />
        <ellipse cx="100" cy="111" rx="46" ry="5" fill="#fff7ee" opacity="0.28" />
        <path d="M40 120 L20 130" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M160 120 L180 130" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </g>
      <ellipse cx="100" cy="180" rx="34" ry="6" fill="#17131f" opacity="0.12" />
    </svg>
  );
}
