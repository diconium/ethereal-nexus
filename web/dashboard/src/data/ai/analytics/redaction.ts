const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\+?[0-9][0-9()\-\s]{6,}[0-9]/g;
const TOKEN_REGEX = /\b(?:sk|pk|rk|pat)_[A-Za-z0-9_-]{12,}\b/g;

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function redactAnalyticsText(value: string, maxLength = 600) {
  return truncate(
    value
      .replace(EMAIL_REGEX, '[redacted-email]')
      .replace(PHONE_REGEX, '[redacted-phone]')
      .replace(TOKEN_REGEX, '[redacted-token]')
      .trim(),
    maxLength,
  );
}
