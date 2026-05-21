import {logger} from "@/lib/logger";

type GoogleError = {
  code?: unknown;
  details?: unknown;
  metadata?: {
    getMap?: () => Record<string, unknown>;
  };
} & Error;

const isGoogleError = (obj: unknown): obj is GoogleError => {
  return obj !== null && obj !== undefined && typeof obj === "object" && ("code" in obj || "details" in obj || "metadata" in obj);
}

export function formatGoogleError(error: unknown, fallbackMessage: string) {

  if (isGoogleError(error)) {

    const code = error.code?.toString?.() ?? null;
    const details = error.details?.toString()?.trim() ?? null;

    const metadata = error.metadata?.getMap?.();

    const metadataSummary = metadata
      ? Object.entries(metadata)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(', ')
      : '';

    const message = [
      fallbackMessage,
      error.message?.trim() ?? null,
      code ? `code=${code}` : null,
      details ? `details=${details}` : null,
      metadataSummary ? `metadata=${metadataSummary}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return new Error(message);

  }

  return new Error(fallbackMessage);

}

export function decodeHttpBody(response: {
  data?: Uint8Array | Buffer | string | null;
}) {
  if (!response.data) {
    return '';
  }

  return typeof response.data === 'string'
    ? response.data
    : Buffer.from(response.data).toString('utf8');
}

function normaliseExtractedText(text?: string) {
  return text?.replace(/\r\n/g, '\n').trim() || "";
}

function extractTextFromParsedPayload(parsed: Record<string, unknown>) {
  const textCandidate = [
    parsed.error,
    parsed.message,
    parsed.question,
    parsed.answer,
  ].find((value) => typeof value === 'string' && value.trim()) as
    | string
    | undefined;

  if (!textCandidate) {
    return {text: '', isError: false};
  }

  const code = typeof parsed.code === 'number' ? parsed.code : null;
  const isError = code !== null && code >= 400;

  return {
    text: textCandidate.trim(),
    isError,
  };
}

function extractJsonBlock(text: string) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
  return match ? match[1].trim() : text;
}

function extractTextFromStructuredMessage(text: string) {
  const candidate = extractJsonBlock(text);


  try {
    const parsed = JSON.parse(candidate);
    return extractTextFromParsedPayload(parsed);
  } catch(error) {
    logger.error("Error parsing candidate")
    return {text: '', isError: false};
  }
}

export function extractTextFromPayload(payload: string) {
  const trimmedPayload = payload.trim();

  try {
    const parsed = JSON.parse(trimmedPayload);

    const plainText = extractTextFromParsedPayload(parsed);

    if (plainText.text) {
      return plainText;
    }

    const parts = parsed.content?.parts;

    if (!Array.isArray(parts) || !parts.length) {
      return {text: trimmedPayload, isError: false};
    }

    const extracted = parts
      .map((part) => {
        if (typeof part?.text !== 'string') {
          return {text: undefined, isError: false};
        }

        const structured = extractTextFromStructuredMessage(part.text);
        return structured.text
          ? structured
          : {
            text: normaliseExtractedText(part.text),
            isError: false,
          };
      })
      .filter((item) => item.text);

    const firstError = extracted.find((item) => item.isError);
    if (firstError) {
      return firstError;
    }

    return {
      text: extracted.map((item) => item.text).join('\n').trim(),
      isError: false,
    };
  } catch(error) {
    logger.error("Error parsing candidate")

    return {text: normaliseExtractedText(trimmedPayload), isError: false};
  }

}