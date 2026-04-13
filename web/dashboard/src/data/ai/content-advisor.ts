export const CONTENT_ADVISOR_AGENT_KEYS = [
  'seo-performance',
  'accessibility',
  'content',
  'broken-link',
  'compliance',
] as const;

export type ContentAdvisorAgentKey =
  (typeof CONTENT_ADVISOR_AGENT_KEYS)[number];

export const CONTENT_ADVISOR_ISSUE_TYPES = [
  'stale-content',
  'incorrect-content',
  'incoherent-content',
  'duplicate-content',
  'broken-content',
] as const;

export type ContentAdvisorIssueType =
  (typeof CONTENT_ADVISOR_ISSUE_TYPES)[number];

export const CONTENT_ADVISOR_SEVERITIES = [
  'critical',
  'warning',
  'info',
] as const;

export type ContentAdvisorSeverity =
  (typeof CONTENT_ADVISOR_SEVERITIES)[number];

export const CONTENT_ADVISOR_ISSUE_STATUSES = [
  'open',
  'in-progress',
  'done',
  'wont-do',
] as const;

export type ContentAdvisorIssueStatus =
  (typeof CONTENT_ADVISOR_ISSUE_STATUSES)[number];

export const CONTENT_ADVISOR_AGENT_CATALOG = [
  {
    key: 'seo-performance' as const,
    name: 'SEO & Performance',
    description:
      'Analyses meta tags, heading structure, page titles, structured data, image optimisation, Core Web Vitals signals, and canonical URLs to improve search visibility and load performance.',
    defaultPrompt:
      'Focus on SEO metadata, heading hierarchy, structured data, image alt text and size, Core Web Vitals signals, and canonical URL correctness.',
  },
  {
    key: 'accessibility' as const,
    name: 'Accessibility',
    description:
      'Audits pages against WCAG 2.1 AA criteria — missing alt text, form labels, heading hierarchy, colour contrast, keyboard navigation, and ARIA usage.',
    defaultPrompt:
      'Audit against WCAG 2.1 AA, including alt text, form labels, heading order, colour contrast, keyboard-navigable interactions, and ARIA roles.',
  },
  {
    key: 'content' as const,
    name: 'Content',
    description:
      'Reviews prose quality, tone of voice, brand consistency, terminology uniformity across pages, duplicate content, and structural clarity.',
    defaultPrompt:
      'Review the page content for incoherent writing, placeholder text, weak structure, repeated copy, unclear calls to action, prose quality, tone of voice consistency, brand alignment, terminology uniformity, duplicate content, and structural clarity. Return only valid JSON with the shape {"summary": string, "issues": [{"issue_type": "stale-content" | "incorrect-content" | "incoherent-content" | "duplicate-content" | "broken-content", "severity": "critical" | "warning" | "info", "status": "open", "title": string, "description": string, "suggestion": string, "reasoning": string}]}. If no issues are found, return {"summary":"No issues found.","issues":[]}.',
  },
  {
    key: 'broken-link' as const,
    name: 'Broken Link',
    description:
      'Crawls configured pages and follows links up to a configurable depth, checking each link for HTTP errors (4xx/5xx). Only follows links within the same domain. Reports all broken or unreachable URLs as issues.',
    defaultPrompt: '',
  },
  {
    key: 'compliance' as const,
    name: 'Compliance',
    description:
      'Audits pages for legal and regulatory completeness. Checks for: GDPR-compliant cookie consent banners (OneTrust, CookieBot, or equivalent); accessible links to Privacy Policy and Terms & Conditions in the page footer or navigation; required legal disclaimers and copyright notices; regulatory copy completeness (e.g. financial, medical, or age-gating notices where applicable); and stale year references in copyright statements.',
    defaultPrompt:
      'Check for GDPR-compliant cookie consent banners, visible links to Privacy Policy and Terms & Conditions, required legal disclaimers, and regulatory copy completeness. Return only valid JSON with the shape {"summary": string, "issues": [{"issue_type": "incorrect-content" | "stale-content", "severity": "critical" | "warning" | "info", "status": "open", "title": string, "description": string, "suggestion": string, "reasoning": string}]}. If no issues are found, return {"summary":"No issues found.","issues":[]}.',
  },
];

export const CONTENT_ADVISOR_AGENT_KEY_TO_ISSUE_TYPES: Record<
  ContentAdvisorAgentKey,
  ContentAdvisorIssueType[]
> = {
  'seo-performance': ['stale-content', 'incorrect-content', 'broken-content'],
  accessibility: ['incorrect-content', 'broken-content'],
  content: ['stale-content', 'incoherent-content'],
  'broken-link': ['broken-content'],
  compliance: ['incorrect-content'],
};
