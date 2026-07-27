import { useRef, useSyncExternalStore, type ReactElement } from "react";

// Loading animations — hand-drawn inline SVG + CSS keyframes, no deps.
//
// With no `variant` prop, one animation is picked at random per mount
// (client-side only, to avoid SSR/hydration mismatch on the statically
// prerendered pages). Pass an explicit `variant` to pin one.
//
// The variants were designed with specific processing actions in mind —
// kept here as notes for the day we want to tie them back to contexts
// (also recorded in MEMORY.md):
//
//   ignition       general loading — "Firing up the wok..."
//   hei-burst      search — "Finding wok hei..."
//   steamer        default page loads — "Steaming..."
//   rolling-dough  general / form prep — "Rolling things out..."
//   simmering-pot  AI draft / thinking waits — "Simmering..."
//   chopping-board URL import / paste extraction — "Chopping things up..."
//   teh-tarik      AI draft / brewing — "Pulling the teh tarik..."
//   satay          app boot / slow saves — "Fanning the coals..."
//   rempah         transcription / conversation capture — "Pounding the rempah..."
type LoadingVariant =
  | "ignition"
  | "hei-burst"
  | "steamer"
  | "rolling-dough"
  | "simmering-pot"
  | "chopping-board"
  | "teh-tarik"
  | "satay"
  | "rempah";

interface LoadingAnimationProps {
  className?: string;
  size?: number;
  label?: string;
  variant?: LoadingVariant;
}

const VARIANTS: Record<
  LoadingVariant,
  { label: string; Art: (props: { size: number }) => ReactElement }
> = {
  ignition: { label: "Firing up the wok...", Art: WokIgnition },
  "hei-burst": { label: "Finding wok hei...", Art: HeiBurstWok },
  steamer: { label: "Steaming...", Art: SteamerStack },
  "rolling-dough": { label: "Rolling things out...", Art: RollingDough },
  "simmering-pot": { label: "Simmering...", Art: SimmeringPot },
  "chopping-board": { label: "Chopping things up...", Art: ChoppingBoard },
  "teh-tarik": { label: "Pulling the teh tarik...", Art: TehTarikPull },
  satay: { label: "Fanning the coals...", Art: FanningSatay },
  rempah: { label: "Pounding the rempah...", Art: PoundingRempah },
};

const ALL_VARIANTS = Object.keys(VARIANTS) as LoadingVariant[];

function pickRandomVariant(): LoadingVariant {
  return ALL_VARIANTS[Math.floor(Math.random() * ALL_VARIANTS.length)];
}

export function LoadingAnimation({
  className = "",
  size = 120,
  label,
  variant,
}: LoadingAnimationProps) {
  // Random picks happen only on the client: pages like /login are
  // statically prerendered, and a server-side Math.random() would
  // hydrate against a different client pick and mismatch. The server
  // snapshot returns null, so SSR and the first client render show the
  // reserved-space placeholder; the client snapshot then supplies a
  // cached random variant (cached so repeat getSnapshot calls are
  // stable, as useSyncExternalStore requires).
  const pickRef = useRef<LoadingVariant | null>(null);
  const randomVariant = useSyncExternalStore(
    () => () => {},
    () => (pickRef.current ??= pickRandomVariant()),
    () => null
  );

  const chosen = variant ?? randomVariant;

  if (!chosen) {
    // Reserve the layout space so content doesn't jump once mounted.
    return (
      <div
        className={`flex flex-col items-center justify-center ${className}`}
        style={{ minHeight: size }}
        aria-live="polite"
      />
    );
  }

  const { label: defaultLabel, Art } = VARIANTS[chosen];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} aria-live="polite">
      <Art size={size} />
      <p className="mt-4 text-sm font-medium text-neutral-500">
        {label ?? defaultLabel}
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


function SteamerStack({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Bamboo steamer with rising steam"
    >
      <style>
        {`
          @keyframes steamer-steam {
            0% { transform: translateY(14px); opacity: 0; }
            30% { opacity: 0.5; }
            100% { transform: translateY(-26px); opacity: 0; }
          }
          @keyframes steamer-lid {
            0%, 100% { transform: translateY(0); }
            8% { transform: translateY(-3px); }
            16% { transform: translateY(0); }
            24% { transform: translateY(-2px); }
            32% { transform: translateY(0); }
          }
          .steamer-steam-1 { animation: steamer-steam 2.4s infinite ease-out; }
          .steamer-steam-2 { animation: steamer-steam 2.4s infinite ease-out 0.8s; }
          .steamer-steam-3 { animation: steamer-steam 2.4s infinite ease-out 1.6s; }
          .steamer-lid { animation: steamer-lid 1.8s infinite ease-in-out; }
        `}
      </style>

      <g className="steamer-steam-1" opacity="0.5">
        <path d="M80 74 C70 58 92 52 82 36" stroke="#800020" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className="steamer-steam-2" opacity="0.45">
        <path d="M102 72 C93 57 113 51 104 37" stroke="#C47A32" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className="steamer-steam-3" opacity="0.42">
        <path d="M123 74 C114 59 134 53 125 39" stroke="#800020" strokeWidth="5" strokeLinecap="round" />
      </g>

      <g className="steamer-lid">
        <rect x="48" y="88" width="104" height="10" rx="5" fill="#D9A05B" />
        <ellipse cx="100" cy="88" rx="52" ry="9" fill="#E3B273" />
        <rect x="93" y="76" width="14" height="7" rx="3.5" fill="#B07A3A" />
      </g>

      <rect x="50" y="98" width="100" height="26" rx="4" fill="#C47A32" />
      <path d="M64 101 V121 M78 101 V121 M92 101 V121 M106 101 V121 M120 101 V121 M134 101 V121" stroke="#A96F2C" strokeWidth="2.5" />
      <rect x="50" y="126" width="100" height="26" rx="4" fill="#B07A3A" />
      <path d="M64 129 V149 M78 129 V149 M92 129 V149 M106 129 V149 M120 129 V149 M134 129 V149" stroke="#96622A" strokeWidth="2.5" />

      <ellipse cx="100" cy="158" rx="52" ry="6" fill="#17131f" opacity="0.12" />
    </svg>
  );
}

function RollingDough({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Rolling pin flattening dough"
    >
      <style>
        {`
          @keyframes dough-pin {
            0%, 100% { transform: translateX(-26px); }
            50% { transform: translateX(26px); }
          }
          @keyframes dough-flatten {
            0%, 100% { transform: scaleX(0.84) scaleY(1.08); }
            50% { transform: scaleX(1.14) scaleY(0.92); }
          }
          @keyframes dough-flour {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.6; }
          }
          .dough-pin { animation: dough-pin 2.2s infinite ease-in-out; }
          .dough-flatten { animation: dough-flatten 2.2s infinite ease-in-out; transform-origin: 100px 146px; }
          .dough-flour { animation: dough-flour 2.2s infinite ease-in-out; }
        `}
      </style>

      <rect x="36" y="152" width="128" height="6" rx="3" fill="currentColor" opacity="0.85" />

      <ellipse className="dough-flatten" cx="100" cy="146" rx="26" ry="9" fill="#EDCB96" />
      <ellipse cx="100" cy="143" rx="14" ry="4" fill="#F7E3BD" opacity="0.7" />

      <g className="dough-flour">
        <circle cx="66" cy="150" r="2" fill="#F7E3BD" />
        <circle cx="136" cy="148" r="2.5" fill="#F7E3BD" />
        <circle cx="122" cy="153" r="1.5" fill="#F7E3BD" />
      </g>

      <g className="dough-pin">
        <path d="M56 126 H72 M128 126 H144" stroke="#A96F2C" strokeWidth="6" strokeLinecap="round" />
        <rect x="70" y="118" width="60" height="15" rx="7.5" fill="#C47A32" />
        <rect x="70" y="120" width="60" height="5" rx="2.5" fill="#D9A05B" opacity="0.8" />
      </g>

      <ellipse cx="100" cy="164" rx="46" ry="5" fill="#17131f" opacity="0.1" />
    </svg>
  );
}

function SimmeringPot({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Pot simmering with rising bubbles"
    >
      <style>
        {`
          @keyframes simmer-bubble {
            0% { transform: translateY(0) scale(0.6); opacity: 0; }
            25% { opacity: 0.85; }
            100% { transform: translateY(-26px) scale(1); opacity: 0; }
          }
          @keyframes simmer-lid {
            0%, 100% { transform: translateY(0) rotate(-4deg); }
            10% { transform: translateY(-2.5px) rotate(-3deg); }
            20% { transform: translateY(0) rotate(-4deg); }
            55% { transform: translateY(0) rotate(-4deg); }
            62% { transform: translateY(-1.5px) rotate(-5deg); }
            70% { transform: translateY(0) rotate(-4deg); }
          }
          @keyframes simmer-steam {
            0% { transform: translateY(10px); opacity: 0; }
            35% { opacity: 0.45; }
            100% { transform: translateY(-22px); opacity: 0; }
          }
          .simmer-bubble-1 { animation: simmer-bubble 1.6s infinite ease-out; }
          .simmer-bubble-2 { animation: simmer-bubble 1.6s infinite ease-out 0.5s; }
          .simmer-bubble-3 { animation: simmer-bubble 1.6s infinite ease-out 1.05s; }
          .simmer-lid { animation: simmer-lid 2.6s infinite ease-in-out; transform-origin: 118px 92px; }
          .simmer-steam { animation: simmer-steam 2.8s infinite ease-out 0.4s; }
        `}
      </style>

      <g className="simmer-steam" opacity="0.45">
        <path d="M142 66 C134 52 152 47 144 34" stroke="#C47A32" strokeWidth="5" strokeLinecap="round" />
      </g>

      <path d="M48 108 L38 102 M152 108 L162 102" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M52 100 H148 V138 C148 152 134 162 100 162 C66 162 52 152 52 138 Z" fill="currentColor" />
      <ellipse cx="100" cy="100" rx="48" ry="8" fill="currentColor" />
      <ellipse cx="100" cy="102" rx="38" ry="5.5" fill="#BFE0F5" opacity="0.45" />

      <g className="simmer-bubble-1"><circle cx="88" cy="100" r="3.5" fill="#BFE0F5" /></g>
      <g className="simmer-bubble-2"><circle cx="104" cy="101" r="3" fill="#BFE0F5" /></g>
      <g className="simmer-bubble-3"><circle cx="118" cy="100" r="2.5" fill="#BFE0F5" /></g>

      <g className="simmer-lid">
        <ellipse cx="100" cy="92" rx="40" ry="7" fill="#D9A05B" />
        <rect x="94" y="82" width="12" height="7" rx="3.5" fill="#B07A3A" />
      </g>

      <ellipse cx="100" cy="168" rx="44" ry="5" fill="#17131f" opacity="0.12" />
    </svg>
  );
}

function ChoppingBoard({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Knife chopping vegetables on a board"
    >
      <style>
        {`
          @keyframes chop-knife {
            0%, 100% { transform: rotate(-16deg); }
            28% { transform: rotate(6deg); }
            42% { transform: rotate(-4deg); }
            56% { transform: rotate(-16deg); }
          }
          @keyframes chop-piece-a {
            0%, 26% { transform: translate(0, 0); opacity: 0.95; }
            45% { transform: translate(-14px, -16px); opacity: 1; }
            70%, 100% { transform: translate(-18px, 2px); opacity: 0.9; }
          }
          @keyframes chop-piece-b {
            0%, 26% { transform: translate(0, 0); opacity: 0.95; }
            48% { transform: translate(12px, -20px); opacity: 1; }
            72%, 100% { transform: translate(16px, 2px); opacity: 0.9; }
          }
          @keyframes chop-piece-c {
            0%, 26% { transform: translate(0, 0); opacity: 0.95; }
            44% { transform: translate(2px, -24px); opacity: 1; }
            68%, 100% { transform: translate(4px, 3px); opacity: 0.9; }
          }
          .chop-knife { animation: chop-knife 1.4s infinite ease-in-out; transform-origin: 122px 128px; }
          .chop-piece-a { animation: chop-piece-a 1.4s infinite ease-out; }
          .chop-piece-b { animation: chop-piece-b 1.4s infinite ease-out; }
          .chop-piece-c { animation: chop-piece-c 1.4s infinite ease-out; }
        `}
      </style>

      <rect x="42" y="130" width="116" height="16" rx="6" fill="#C47A32" />
      <rect x="42" y="130" width="116" height="5" rx="2.5" fill="#D9A05B" opacity="0.8" />
      <ellipse cx="100" cy="152" rx="56" ry="5" fill="#17131f" opacity="0.1" />

      <rect x="118" y="122" width="16" height="8" rx="3" fill="#2F9E44" />
      <rect x="106" y="124" width="10" height="6" rx="2.5" fill="#37B24D" />

      <g className="chop-piece-a"><rect x="112" y="122" width="7" height="6" rx="2" fill="#2F9E44" /></g>
      <g className="chop-piece-b"><rect x="122" y="120" width="6" height="6" rx="2" fill="#37B24D" /></g>
      <g className="chop-piece-c"><rect x="117" y="118" width="6" height="5" rx="2" fill="#2F9E44" /></g>

      <g className="chop-knife">
        <path d="M84 116 L122 122 L122 132 L88 130 C80 128 78 120 84 116 Z" fill="#DDE3EA" />
        <path d="M84 116 L122 122 L122 125 L86 120 Z" fill="#F4F7FA" />
        <rect x="120" y="114" width="34" height="11" rx="5.5" fill="currentColor" />
      </g>
    </svg>
  );
}

function TehTarikPull({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Teh tarik poured between two cups"
    >
      <style>
        {`
          @keyframes tarik-stream {
            0% { stroke-dashoffset: 16; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes tarik-foam {
            0%, 100% { transform: scale(0.85); opacity: 0.75; }
            50% { transform: scale(1.08); opacity: 1; }
          }
          @keyframes tarik-lift {
            0%, 100% { transform: translateY(0) rotate(-14deg); }
            50% { transform: translateY(-4px) rotate(-17deg); }
          }
          .tarik-stream { animation: tarik-stream 0.7s infinite linear; }
          .tarik-foam { animation: tarik-foam 1.4s infinite ease-in-out; transform-origin: 128px 128px; }
          .tarik-lift { animation: tarik-lift 2.2s infinite ease-in-out; transform-origin: 74px 66px; }
        `}
      </style>

      <g className="tarik-lift">
        <path d="M52 52 L96 52 L90 88 L58 88 Z" fill="#FBE8C8" opacity="0.35" />
        <path d="M52 52 L96 52 L90 88 L58 88 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M56 62 L92 62 L89 84 L59 84 Z" fill="#B85C1E" opacity="0.9" />
        <ellipse cx="74" cy="62" rx="18" ry="3.5" fill="#FBE8C8" />
      </g>

      <path
        className="tarik-stream"
        d="M92 86 C104 100 116 112 124 124"
        stroke="#C77B3B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="10 6"
      />

      <path d="M104 128 L152 128 L146 166 L110 166 Z" fill="#FBE8C8" opacity="0.35" />
      <path d="M104 128 L152 128 L146 166 L110 166 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M108 138 L148 138 L145 162 L111 162 Z" fill="#B85C1E" opacity="0.9" />
      <g className="tarik-foam">
        <ellipse cx="128" cy="138" rx="20" ry="4" fill="#FBE8C8" />
        <circle cx="120" cy="136" r="2" fill="#FDF3DC" />
        <circle cx="134" cy="137" r="1.6" fill="#FDF3DC" />
      </g>

      <ellipse cx="128" cy="172" rx="30" ry="4.5" fill="#17131f" opacity="0.12" />
    </svg>
  );
}

function FanningSatay({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Satay skewers over charcoal being fanned"
    >
      <style>
        {`
          @keyframes satay-ember {
            0%, 100% { transform: scale(0.85); opacity: 0.55; }
            50% { transform: scale(1.15); opacity: 1; }
          }
          @keyframes satay-fan {
            0%, 100% { transform: rotate(-14deg); }
            50% { transform: rotate(12deg); }
          }
          @keyframes satay-smoke {
            0% { transform: translateY(12px) translateX(0); opacity: 0; }
            30% { opacity: 0.45; }
            100% { transform: translateY(-24px) translateX(-8px); opacity: 0; }
          }
          @keyframes satay-spark {
            0%, 100% { transform: translateY(0) scale(0.5); opacity: 0; }
            50% { transform: translateY(-16px) scale(1); opacity: 0.9; }
          }
          .satay-ember-1 { animation: satay-ember 1.6s infinite ease-in-out; transform-origin: center; }
          .satay-ember-2 { animation: satay-ember 1.6s infinite ease-in-out 0.4s; transform-origin: center; }
          .satay-ember-3 { animation: satay-ember 1.6s infinite ease-in-out 0.8s; transform-origin: center; }
          .satay-fan { animation: satay-fan 1.6s infinite ease-in-out; transform-origin: 158px 122px; }
          .satay-smoke-1 { animation: satay-smoke 2.6s infinite ease-out; }
          .satay-smoke-2 { animation: satay-smoke 2.6s infinite ease-out 1.2s; }
          .satay-spark { animation: satay-spark 1.6s infinite ease-out 0.3s; transform-origin: center; }
        `}
      </style>

      <g className="satay-smoke-1" opacity="0.45">
        <path d="M84 92 C76 78 94 73 86 60" stroke="#800020" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className="satay-smoke-2" opacity="0.4">
        <path d="M110 90 C103 77 119 72 112 60" stroke="#C47A32" strokeWidth="5" strokeLinecap="round" />
      </g>

      <g>
        <path d="M58 118 L96 108" stroke="#8C5A2B" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="70" y="106" width="9" height="7" rx="2" fill="#B07A3A" transform="rotate(-14 74 110)" />
        <rect x="81" y="103" width="9" height="7" rx="2" fill="#9C6630" transform="rotate(-14 85 107)" />
      </g>
      <g>
        <path d="M70 128 L110 120" stroke="#8C5A2B" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="82" y="118" width="9" height="7" rx="2" fill="#B07A3A" transform="rotate(-12 86 122)" />
        <rect x="93" y="115" width="9" height="7" rx="2" fill="#9C6630" transform="rotate(-12 97 119)" />
      </g>

      <rect x="46" y="134" width="108" height="18" rx="5" fill="currentColor" />
      <g className="satay-ember-1"><circle cx="72" cy="143" r="5" fill="#F97316" /></g>
      <g className="satay-ember-2"><circle cx="96" cy="144" r="6" fill="#D9480F" /></g>
      <g className="satay-ember-3"><circle cx="120" cy="143" r="5" fill="#F97316" /></g>
      <circle className="satay-spark" cx="102" cy="132" r="2.5" fill="#FDE68A" />

      <g className="satay-fan">
        <path d="M158 122 C168 104 184 96 194 98 C192 112 180 124 164 128 Z" fill="#C47A32" />
        <path d="M158 122 L150 132" stroke="#8C5A2B" strokeWidth="4" strokeLinecap="round" />
      </g>

      <ellipse cx="100" cy="158" rx="54" ry="5" fill="#17131f" opacity="0.12" />
    </svg>
  );
}

function PoundingRempah({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#17131f]"
      role="img"
      aria-label="Pestle pounding spices in a mortar"
    >
      <style>
        {`
          @keyframes rempah-pound {
            0%, 100% { transform: translateY(-14px) rotate(-24deg); }
            42% { transform: translateY(-14px) rotate(-24deg); }
            52% { transform: translateY(0) rotate(-24deg); }
            60% { transform: translateY(-3px) rotate(-24deg); }
            68% { transform: translateY(0) rotate(-24deg); }
            80% { transform: translateY(-14px) rotate(-24deg); }
          }
          @keyframes rempah-fleck {
            0%, 50% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            58% { opacity: 1; }
            78%, 100% { transform: translate(var(--fx), -22px) scale(1); opacity: 0; }
          }
          @keyframes rempah-ring {
            0%, 51% { transform: scale(0.5); opacity: 0; }
            56% { opacity: 0.5; }
            75%, 100% { transform: scale(1.6); opacity: 0; }
          }
          .rempah-pestle { animation: rempah-pound 1.6s infinite ease-in-out; transform-origin: 100px 96px; }
          .rempah-fleck-1 { animation: rempah-fleck 1.6s infinite ease-out; --fx: -14px; }
          .rempah-fleck-2 { animation: rempah-fleck 1.6s infinite ease-out 0.05s; --fx: 2px; }
          .rempah-fleck-3 { animation: rempah-fleck 1.6s infinite ease-out 0.1s; --fx: 15px; }
          .rempah-ring { animation: rempah-ring 1.6s infinite ease-out; transform-origin: 100px 118px; }
        `}
      </style>

      <ellipse className="rempah-ring" cx="100" cy="118" rx="22" ry="6" stroke="#C47A32" strokeWidth="2.5" />

      <path d="M58 104 C62 142 76 158 100 158 C124 158 138 142 142 104" fill="currentColor" />
      <ellipse cx="100" cy="104" rx="42" ry="8" fill="currentColor" />
      <ellipse cx="100" cy="102" rx="33" ry="5" fill="#fff7ee" opacity="0.22" />

      <circle cx="92" cy="106" r="3" fill="#D9480F" />
      <circle cx="103" cy="108" r="2.5" fill="#F2B66D" />
      <circle cx="111" cy="105" r="2" fill="#D9480F" />

      <g className="rempah-fleck-1"><circle cx="94" cy="100" r="2.5" fill="#D9480F" /></g>
      <g className="rempah-fleck-2"><circle cx="102" cy="100" r="2" fill="#F2B66D" /></g>
      <g className="rempah-fleck-3"><circle cx="110" cy="100" r="2.5" fill="#C47A32" /></g>

      <g className="rempah-pestle">
        <rect x="92" y="42" width="16" height="58" rx="8" fill="#B07A3A" />
        <ellipse cx="100" cy="46" rx="9" ry="5" fill="#C47A32" />
      </g>

      <ellipse cx="100" cy="164" rx="44" ry="5" fill="#17131f" opacity="0.12" />
    </svg>
  );
}
