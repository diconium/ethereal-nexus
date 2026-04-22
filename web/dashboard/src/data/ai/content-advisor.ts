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
  },
  {
    key: 'accessibility' as const,
    name: 'Accessibility',
    description:
      'Audits pages against WCAG 2.1 AA criteria — missing alt text, form labels, heading hierarchy, colour contrast, keyboard navigation, and ARIA usage.',
  },
  {
    key: 'content' as const,
    name: 'Content',
    description:
      'Reviews prose quality, tone of voice, brand consistency, terminology uniformity across pages, duplicate content, and structural clarity.',
  },
  {
    key: 'broken-link' as const,
    name: 'Broken Link',
    description:
      'Crawls configured pages and follows links up to a configurable depth, checking each link for HTTP errors (4xx/5xx). Only follows links within the same domain. Reports all broken or unreachable URLs as issues.',
  },
  {
    key: 'compliance' as const,
    name: 'Compliance',
    description:
      'Audits pages for legal and regulatory completeness. Checks for: GDPR-compliant cookie consent banners (OneTrust, CookieBot, or equivalent); accessible links to Privacy Policy and Terms & Conditions in the page footer or navigation; required legal disclaimers and copyright notices; regulatory copy completeness (e.g. financial, medical, or age-gating notices where applicable); and stale year references in copyright statements.',
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
