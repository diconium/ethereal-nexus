import type {
  ContentAdvisorAgentConfig,
  ContentAdvisorIssueInput,
} from './dto';

type PageAnalysisSource = {
  url: string;
  title?: string | null;
  text: string;
  html: string;
  status: number;
};

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function issue(
  input: Omit<ContentAdvisorIssueInput, 'page_url' | 'page_title'>,
  source: Pick<PageAnalysisSource, 'url' | 'title'>,
): ContentAdvisorIssueInput {
  return {
    page_url: source.url,
    page_title: source.title || null,
    ...input,
  };
}

export async function fetchPageSource(
  url: string,
): Promise<PageAnalysisSource> {
  const response = await fetch(url, { redirect: 'follow' });
  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);

  return {
    url,
    title: titleMatch?.[1]?.trim() || null,
    text: stripHtml(html),
    html,
    status: response.status,
  };
}

export function analyzePageWithAgent(
  agent: ContentAdvisorAgentConfig,
  source: PageAnalysisSource,
): ContentAdvisorIssueInput[] {
  const lowerText = source.text.toLowerCase();
  const issues: ContentAdvisorIssueInput[] = [];

  if (!source.status || source.status >= 400) {
    issues.push(
      issue(
        {
          issue_type: 'broken-content',
          severity: 'critical',
          title: 'Page could not be loaded',
          description: `The scheduled page returned HTTP status ${source.status}.`,
          suggestion:
            'Fix the page availability before running content reviews again.',
          reasoning:
            'The request failed, so no trustworthy page content was available for analysis.',
        },
        source,
      ),
    );
    return issues;
  }

  if (agent.key === 'seo-performance' || agent.key === 'compliance') {
    const oldYears = Array.from(source.text.matchAll(/\b(20\d{2})\b/g))
      .map((match) => Number(match[1]))
      .filter((year) => year < new Date().getFullYear() - 1);

    if (oldYears.length) {
      issues.push(
        issue(
          {
            issue_type: 'stale-content',
            severity: 'warning',
            title: 'Potentially stale year reference',
            description: `Found older year references (${oldYears.join(', ')}) that may indicate outdated content.`,
            suggestion:
              'Review the page copy and confirm whether older year references are still valid.',
            reasoning:
              'Older year values often point to outdated campaigns, pricing windows, or legal references.',
          },
          source,
        ),
      );
    }
  }

  if (agent.key === 'content') {
    if (/lorem ipsum|todo|tbd|coming soon/i.test(lowerText)) {
      issues.push(
        issue(
          {
            issue_type: 'incorrect-content',
            severity: 'warning',
            title: 'Placeholder copy detected',
            description:
              'The page still contains placeholder or draft markers such as lorem ipsum, TODO, or TBD.',
            suggestion:
              'Replace placeholder copy with production-ready content before publishing.',
            reasoning:
              'Placeholder terms are a strong signal that the content is incomplete or no longer valid.',
          },
          source,
        ),
      );
    }

    if (source.text.length > 0 && source.text.length < 180) {
      issues.push(
        issue(
          {
            issue_type: 'incoherent-content',
            severity: 'info',
            title: 'Very short page copy',
            description:
              'The visible text content is extremely short, which can make the page feel incomplete or unclear.',
            suggestion:
              'Review whether the page needs more explanatory copy, context, or supporting details.',
            reasoning:
              'Pages with very little visible text often lack context, clarity, or complete information.',
          },
          source,
        ),
      );
    }
  }

  if (agent.key === 'broken-link') {
    const brokenAnchorCount = (source.html.match(/href=["']#?["']/gi) || [])
      .length;
    if (brokenAnchorCount > 0) {
      issues.push(
        issue(
          {
            issue_type: 'broken-content',
            severity: 'warning',
            title: 'Potential broken or empty links detected',
            description: `Detected ${brokenAnchorCount} empty or placeholder link target(s) on the page.`,
            suggestion:
              'Review anchor links and replace placeholder targets with valid destinations.',
            reasoning:
              'Empty or placeholder href values often lead to broken user journeys or inaccessible navigation.',
          },
          source,
        ),
      );
    }
  }

  if (agent.key === 'accessibility' || agent.key === 'compliance') {
    if (!/privacy|terms|accessibility/i.test(lowerText)) {
      issues.push(
        issue(
          {
            issue_type: 'incorrect-content',
            severity: 'info',
            title: 'No obvious compliance or accessibility references found',
            description:
              'The page content does not mention privacy, terms, or accessibility context.',
            suggestion:
              'Check whether the page should expose legal, consent, or accessibility guidance.',
            reasoning:
              'Certain pages need accessible and compliant supporting content, especially around regulated or user-sensitive journeys.',
          },
          source,
        ),
      );
    }
  }

  return issues;
}
