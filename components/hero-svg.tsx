const HeroSvgComponent = () => {
    return (
        <svg
            className="absolute inset-0 w-full h-full z-0 pointer-events-none transition-colors duration-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1800 900"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <defs>
                {/* Gradients for both themes */}
                <linearGradient id="bgWaveDark" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="bgWaveLight" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop
                        offset="100%"
                        stopColor="#a21caf"
                        stopOpacity="0.18"
                    />
                </linearGradient>
                {/* Glow filter for lines */}
                <filter
                    id="glow"
                    x="-100%"
                    y="-100%"
                    width="300%"
                    height="300%"
                >
                    <feGaussianBlur stdDeviation="6" result="colorBlur" />
                    <feMerge>
                        <feMergeNode in="colorBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {/* Parallax Wavy Lines, Dark/Light */}
            <g>
                {/* Dark mode lines */}
                <g className="dark:opacity-60 opacity-0">
                    <path
                        d="M0,200 Q360,260 720,200 T 1800,220"
                        fill="none"
                        stroke="url(#bgWaveDark)"
                        strokeWidth="3"
                        filter="url(#glow)"
                    />
                    <path
                        d="M0,350 Q480,450 960,340 T 1800,390"
                        fill="none"
                        stroke="url(#bgWaveDark)"
                        strokeWidth="2"
                        filter="url(#glow)"
                        opacity="0.65"
                    />
                    <path
                        d="M0,520 Q600,670 1800,530"
                        fill="none"
                        stroke="url(#bgWaveDark)"
                        strokeWidth="2"
                        filter="url(#glow)"
                        opacity="0.43"
                    />
                    <path
                        d="M0,720 Q720,830 1800,750"
                        fill="none"
                        stroke="url(#bgWaveDark)"
                        strokeWidth="2"
                        filter="url(#glow)"
                        opacity="0.25"
                    />
                </g>
                {/* Light mode lines */}
                <g className="dark:opacity-0 opacity-100">
                    <path
                        d="M0,210 Q320,240 720,210 T 1800,250"
                        fill="none"
                        stroke="url(#bgWaveLight)"
                        strokeWidth="3"
                    />
                    <path
                        d="M0,370 Q480,480 960,370 T 1800,430"
                        fill="none"
                        stroke="url(#bgWaveLight)"
                        strokeWidth="2"
                        opacity="0.6"
                    />
                    <path
                        d="M0,570 Q640,690 1800,590"
                        fill="none"
                        stroke="url(#bgWaveLight)"
                        strokeWidth="2"
                        opacity="0.35"
                    />
                    <path
                        d="M0,790 Q600,860 1800,830"
                        fill="none"
                        stroke="url(#bgWaveLight)"
                        strokeWidth="2"
                        opacity="0.23"
                    />
                </g>
            </g>
            {/* Animated Glowing Particles */}
            <g>
                {/* Dark Particles */}
                <g className="dark:opacity-60 opacity-0">
                    <circle
                        cx="320"
                        cy="140"
                        r="2.5"
                        fill="#a78bfa"
                        filter="url(#glow)"
                    >
                        <animate
                            attributeName="r"
                            values="2.5;4;2.5"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="1;.3;1"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    </circle>
                    <circle
                        cx="880"
                        cy="320"
                        r="1.8"
                        fill="#06b6d4"
                        filter="url(#glow)"
                    >
                        <animate
                            attributeName="r"
                            values="1.8;4;2;1.8"
                            dur="4s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="1;.2;1"
                            dur="2.5s"
                            repeatCount="indefinite"
                        />
                    </circle>
                    <circle
                        cx="630"
                        cy="710"
                        r="2.2"
                        fill="#a21caf"
                        filter="url(#glow)"
                    >
                        <animate
                            attributeName="r"
                            values="2.2;5;2.2"
                            dur="2.5s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="0.7;1;0.5;0.7"
                            dur="3.5s"
                            repeatCount="indefinite"
                        />
                    </circle>
                    <circle
                        cx="1100"
                        cy="500"
                        r="1.7"
                        fill="#a78bfa"
                        filter="url(#glow)"
                    >
                        <animate
                            attributeName="r"
                            values="1.7;3.5;1.7"
                            dur="2.7s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="1;.7;1"
                            dur="2.5s"
                            repeatCount="indefinite"
                        />
                    </circle>
                </g>
                {/* Light Particles */}
                <g className="dark:opacity-0 opacity-100">
                    <circle cx="320" cy="160" r="2.2" fill="#a21caf">
                        <animate
                            attributeName="r"
                            values="2.2;3.5;2.2"
                            dur="3.5s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="1;.28;1"
                            dur="3.5s"
                            repeatCount="indefinite"
                        />
                    </circle>
                    <circle cx="940" cy="260" r="1.6" fill="#6366f1">
                        <animate
                            attributeName="r"
                            values="1.6;3;1.9;1.6"
                            dur="3.7s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="1;.15;1"
                            dur="2s"
                            repeatCount="indefinite"
                        />
                    </circle>
                    <circle cx="780" cy="730" r="2.3" fill="#a21caf">
                        <animate
                            attributeName="r"
                            values="2.3;4.5;2.3"
                            dur="2s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="0.9;1;0.6;0.9"
                            dur="4s"
                            repeatCount="indefinite"
                        />
                    </circle>
                    <circle cx="1200" cy="470" r="1.5" fill="#6366f1">
                        <animate
                            attributeName="r"
                            values="1.5;2.5;1.5"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="1;.54;1"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    </circle>
                </g>
            </g>
        </svg>
    );
};

export default HeroSvgComponent;