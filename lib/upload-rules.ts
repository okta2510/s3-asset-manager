const MB = 1024 * 1024;

export const UPLOAD_ACCEPT =
  ".pdf,.mp3,.mp4,.jpg,.jpeg,.png,.webp,.gif,.svg,.txt,.md,application/pdf,audio/mpeg,video/mp4,image/jpeg,image/png,image/webp,image/gif,image/svg+xml,text/plain,text/markdown";

interface Rule {
  extensions: string[];
  mimeTypes: string[];
  label: string;
  maxSize: number;
  defaultMimeType: string;
}

const RULES: Rule[] = [
  { extensions: [".pdf"], mimeTypes: ["application/pdf"], label: "PDF", maxSize: 25 * MB, defaultMimeType: "application/pdf" },
  { extensions: [".mp3"], mimeTypes: ["audio/mpeg", "audio/mp3"], label: "MP3", maxSize: 50 * MB, defaultMimeType: "audio/mpeg" },
  { extensions: [".mp4"], mimeTypes: ["video/mp4"], label: "MP4", maxSize: 250 * MB, defaultMimeType: "video/mp4" },
  {
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    label: "Image",
    maxSize: 50 * MB,
    defaultMimeType: "image/jpeg",
  },
  { extensions: [".txt"], mimeTypes: ["text/plain"], label: "Text", maxSize: 10 * MB, defaultMimeType: "text/plain" },
  { extensions: [".md"], mimeTypes: ["text/markdown", "text/plain", "text/x-markdown"], label: "Markdown", maxSize: 10 * MB, defaultMimeType: "text/markdown" },
];

function formatMB(bytes: number) {
  return `${Math.round(bytes / MB)}MB`;
}

function findRule(name: string, type: string) {
  const lowerName = name.toLowerCase();

  return RULES.find((rule) => {
    const extMatch = rule.extensions.some((ext) => lowerName.endsWith(ext));
    const mimeMatch = type ? rule.mimeTypes.includes(type) : false;
    return extMatch || mimeMatch;
  });
}

function getMimeType(name: string, type: string, rule: Rule): string {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".mp3")) return "audio/mpeg";
  if (lowerName.endsWith(".mp4")) return "video/mp4";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".svg")) return "image/svg+xml";
  if (lowerName.endsWith(".txt")) return "text/plain";
  if (lowerName.endsWith(".md")) return "text/markdown";
  return type || rule.defaultMimeType;
}

export function validateUploadFile(file: { name: string; type: string; size: number }) {
  if (file.name.endsWith("/") || file.type === "application/x-directory") {
    return { valid: true, mimeType: "application/x-directory" };
  }

  const rule = findRule(file.name, file.type);

  if (!rule) {
    return {
      valid: false,
      error: `${file.name} must be a PDF, MP3, MP4, Image (JPG, PNG, WEBP, GIF, SVG), TXT, or MD file.`,
    };
  }

  if (file.size > rule.maxSize) {
    return {
      valid: false,
      error: `${file.name} exceeds the ${rule.label} limit of ${formatMB(rule.maxSize)}.`,
    };
  }

  return { valid: true, mimeType: getMimeType(file.name, file.type, rule) };
}
