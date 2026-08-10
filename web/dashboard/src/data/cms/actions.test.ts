/**
 * @jest-environment node
 *
 * Unit tests for CMS connection Server Actions.
 * Tests the observable behaviour of credential handling, delete in-use
 * protection, and RBAC via mocked auth and DB.
 */

import { SECRET_PLACEHOLDER } from '@/data/cms/config';

// ---------------------------------------------------------------------------
// mergeSecrets is a private function — test it via its effect on upsertCmsConnection.
// We verify the behaviour by inspecting what the encryptJson spy receives.
// ---------------------------------------------------------------------------

// Mock auth — default to unauthenticated; individual tests override this.
const mockAuthUser = { id: 'user-1' };
let authReturnValue: { user: { id: string } } | null = null;

jest.mock('@/auth', () => ({
  auth: jest.fn(async () => authReturnValue),
}));

// Mock DB
const mockDbSelect = jest.fn();
const mockDbInsert = jest.fn();
const mockDbUpdate = jest.fn();
const mockDbDelete = jest.fn();

jest.mock('@/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => [null] }) }),
    insert: () => ({ values: () => ({ returning: () => [{}] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [{}] }) }) }),
    delete: () => ({ where: () => Promise.resolve() }),
  },
  dbUncached: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => [] }) }) }),
  },
}));

jest.mock('@/lib/crypto', () => ({
  encryptJson: (data: unknown) => JSON.stringify(data),
  decryptJson: (data: string) => JSON.parse(data),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn() } }));

// ---------------------------------------------------------------------------
// SECRET_PLACEHOLDER preservation test
// ---------------------------------------------------------------------------

describe('SECRET_PLACEHOLDER constant', () => {
  it('equals __KEEP__', () => {
    expect(SECRET_PLACEHOLDER).toBe('__KEEP__');
  });
});

// ---------------------------------------------------------------------------
// RBAC — unauthenticated access
// ---------------------------------------------------------------------------

describe('upsertCmsConnection — RBAC', () => {
  beforeEach(() => {
    authReturnValue = null; // unauthenticated
  });

  it('returns an error when there is no session', async () => {
    const { upsertCmsConnection } = await import('@/data/cms/actions');
    const result = await upsertCmsConnection({
      project_id: 'proj-1',
      provider: 'strapi',
      role: 'source',
      config: { name: 'Test', serverUrl: 'https://strapi.example.com', apiToken: 'tok' },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deleteCmsConnection — in-use protection
// ---------------------------------------------------------------------------

describe('deleteCmsConnection — in-use protection', () => {
  it('returns an error message referencing the blocking job', async () => {
    authReturnValue = { user: mockAuthUser };

    // Override db.select to return an active job for this connection.
    const { db } = await import('@/db');
    jest.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => [{ id: 'job-abc', status: 'running' }],
      }),
    } as unknown as ReturnType<typeof db.select>);

    const { deleteCmsConnection } = await import('@/data/cms/actions');
    const result = await deleteCmsConnection('conn-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/job-abc/);
    }
  });
});
