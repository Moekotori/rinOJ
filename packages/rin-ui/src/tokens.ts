export const rinTokens = {
  color: {
    sakuraWhite: "#FDFBF7",
    hazePink: "#FFD3DC",
    skyBlue: "#A8D8EA",
    lavender: "#C5B4E3",
    nightPurple: "#1A1530",
    ink: "#2B2638",
    mint: "#B9E8D5",
    gold: "#F8D98B",
  },
  radius: {
    surface: "16px",
    control: "12px",
  },
  shadow: {
    soft: "0 18px 55px rgba(58, 45, 88, 0.14)",
    lift: "0 10px 28px rgba(58, 45, 88, 0.18)",
  },
} as const;

export type RinTokens = typeof rinTokens;
