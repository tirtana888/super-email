import { useTheme } from "@usesend/ui";

export function useColors() {
  const { resolvedTheme } = useTheme();

  const lightColors = {
    delivered: "#1E7F48",
    bounced: "#C2303C",
    complained: "#A35F00",
    opened: "#5B5FC7",
    clicked: "#2E5BDB",
    xaxis: "#74747F",
  };

  const darkColors = {
    delivered: "#4CC07E",
    bounced: "#F06B76",
    complained: "#E2A447",
    opened: "#9A9DF0",
    clicked: "#7C9BF5",
    xaxis: "#8A8A96",
  };

  const currentColors = resolvedTheme === "dark" ? darkColors : lightColors;

  return currentColors;
}
