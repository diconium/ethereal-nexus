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
      'Review prose quality, brand tone of voice, terminology consistency, duplicate or near-duplicate copy, readability, and structural clarity.',
  },
  {
    key: 'broken-link' as const,
    name: 'Broken Link',
    description:
      'Detects broken internal and external hyperlinks, missing redirects, and anchor targets that return error status codes.',
    defaultPrompt:
      'Identify hyperlinks that return 4xx or 5xx status codes, missing redirect rules for moved pages, and anchor fragment targets that no longer exist.',
  },
  {
    key: 'compliance' as const,
    name: 'Compliance',
    description:
      'Checks for required legal notices, GDPR/cookie consent banners, T&C and Privacy Policy accessibility, disclaimer presence, and regulatory copy requirements.',
    defaultPrompt:
      'Check for GDPR-compliant cookie consent banners, visible links to Privacy Policy and Terms & Conditions, required legal disclaimers, and regulatory copy completeness.',
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
