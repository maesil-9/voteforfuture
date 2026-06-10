import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

/**
 * 침착투표소 디자인 시스템.
 *
 * 톤: calm / quiet / civic / private booth / folded paper / soft ink.
 * - 배경: 완전한 흰색 대신 따뜻한 off-white (한지 느낌)
 * - 텍스트: 완전한 black 대신 soft ink
 * - 포인트: ink blue(주) + warm yellow(스탬프/하이라이트 보조)
 */

const config = defineConfig({
  globalCss: {
    html: {
      scrollBehavior: "smooth",
    },
    body: {
      bg: "paper.50",
      color: "ink.900",
      fontFamily: "body",
      lineHeight: 1.65,
      letterSpacing: "-0.01em",
    },
    "::selection": {
      bg: "booth.200",
      color: "ink.900",
    },
    "*": {
      "@media (prefers-reduced-motion: reduce)": {
        animationDuration: "0.01ms !important",
        transitionDuration: "0.01ms !important",
      },
    },
  },
  theme: {
    tokens: {
      colors: {
        paper: {
          50: { value: "#FBF8F1" }, // 본문 배경 (따뜻한 미색)
          100: { value: "#F5F0E4" },
          200: { value: "#EAE2D0" },
          300: { value: "#DCD1B8" },
        },
        ink: {
          300: { value: "#A8A293" },
          500: { value: "#6E6857" },
          700: { value: "#46412F" },
          900: { value: "#2A2718" }, // soft black
        },
        booth: {
          // ink blue 계열 (주 포인트)
          100: { value: "#E3EAF0" },
          200: { value: "#C2D2DF" },
          400: { value: "#5C7B96" },
          600: { value: "#34506B" },
          700: { value: "#27405A" },
          800: { value: "#1C3247" },
        },
        stamp: {
          // warm yellow 계열 (도장/하이라이트)
          100: { value: "#F7ECD4" },
          300: { value: "#EBCF94" },
          500: { value: "#D9A441" },
          700: { value: "#A87A24" },
        },
        sealwax: {
          // 봉인 왁스 (아주 절제된 적갈색 — 봉인 메타포 전용)
          500: { value: "#9C4A36" },
          700: { value: "#7C3526" },
        },
      },
      fonts: {
        heading: {
          value: `'Noto Serif KR', 'Apple SD Gothic Neo', serif`,
        },
        body: {
          value: `'Pretendard Variable', Pretendard, 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`,
        },
        mono: {
          value: `'JetBrains Mono', 'D2Coding', Consolas, monospace`,
        },
      },
      shadows: {
        paper: {
          value: "0 1px 2px rgba(42,39,24,0.06), 0 8px 24px -12px rgba(42,39,24,0.18)",
        },
        paperLift: {
          value: "0 2px 4px rgba(42,39,24,0.08), 0 16px 40px -16px rgba(42,39,24,0.28)",
        },
      },
    },
    semanticTokens: {
      colors: {
        "bg.canvas": { value: "{colors.paper.50}" },
        "bg.surface": { value: "#FFFEFA" },
        "bg.sunken": { value: "{colors.paper.100}" },
        "fg.default": { value: "{colors.ink.900}" },
        "fg.muted": { value: "{colors.ink.500}" },
        "fg.subtle": { value: "{colors.ink.300}" },
        "border.default": { value: "{colors.paper.300}" },
        accent: { value: "{colors.booth.600}" },
        "accent.emphasis": { value: "{colors.booth.800}" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
