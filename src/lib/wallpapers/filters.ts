export const resolutionPresets = [
  { value: "hd", label: "1080P+", minWidth: 1920, minHeight: 1080 },
  { value: "qhd", label: "2K+", minWidth: 2560, minHeight: 1440 },
  { value: "uhd", label: "4K+", minWidth: 3840, minHeight: 2160 },
] as const;

export function parseResolutionPreset(value: string | undefined) {
  return resolutionPresets.find((preset) => preset.value === value);
}

export function parseColorMode(value: string | undefined) {
  return value === "dark" || value === "light" ? value : undefined;
}
