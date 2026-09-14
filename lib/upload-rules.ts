const MB = 1024 * 1024;

export const UPLOAD_ACCEPT = ".pdf,.mp3,.mp4,application/pdf,audio/mpeg,video/mp4";

const RULES = [
  { extension: ".pdf", mimeType: "application/pdf", label: "PDF", maxSize: 25 * MB },
  { extension: ".mp3", mimeType: "audio/mpeg", label: "MP3", maxSize: 50 * MB },
  { extension: ".mp4", mimeType: "video/mp4", label: "MP4", maxSize: 250 * MB },
];

function formatMB(bytes: number) {
  return `${Math.round(bytes / MB)}MB`;
}

function findRule(name: string, type: string) {
  const lowerName = name.toLowerCase();

  return RULES.find(
    (rule) => type === rule.mimeType || lowerName.endsWith(rule.extension)
  );
}

export function validateUploadFile(file: { name: string; type: string; size: number }) {
  const rule = findRule(file.name, file.type);

  if (!rule) {
    return {
      valid: false,
      error: `${file.name} must be a PDF, MP3, or MP4 file.`,
    };
  }

  if (file.size > rule.maxSize) {
    return {
      valid: false,
      error: `${file.name} exceeds the ${rule.label} limit of ${formatMB(rule.maxSize)}.`,
    };
  }

  return { valid: true, mimeType: rule.mimeType };
}
