import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LiffGuard } from './liff.guard';
import { PrismaService } from '../prisma/prisma.service';

function createContext(auth?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: auth ? { authorization: auth } : {},
        params: { tenantId: 'tenant-1' },
      }),
    }),
  } as unknown as ExecutionContext;
}

function createIdToken(aud = 'attacker-channel') {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ aud, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;
}

describe('LiffGuard', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const prisma = {
    tenant: { findFirst: jest.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;

  it('requires a configured shared LIFF channel instead of trusting token aud', async () => {
    const config = { get: jest.fn(() => '') } as unknown as ConfigService;
    const guard = new LiffGuard(config, prisma);
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(
      guard.canActivate(createContext(`Bearer ${createIdToken()}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies the token against the configured shared LIFF channel', async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'LIFF_CHANNEL_ID' ? '2010103126' : '',
      ),
    } as unknown as ConfigService;
    const guard = new LiffGuard(config, prisma);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sub: 'line-user', exp: 9999999999 }),
    });
    global.fetch = fetchMock;

    await expect(
      guard.canActivate(createContext(`Bearer ${createIdToken()}`)),
    ).resolves.toBe(true);

    expect(String(fetchMock.mock.calls[0][1].body)).toContain(
      'client_id=2010103126',
    );
  });

  it('verifies against the tenant LIFF channel when configured', async () => {
    const config = {
      get: jest.fn(() => 'shared-channel'),
    } as unknown as ConfigService;
    const tenantPrisma = {
      tenant: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ liffId: '2012345678-liffapp' }),
      },
    } as unknown as PrismaService;
    const guard = new LiffGuard(config, tenantPrisma);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sub: 'tenant-line-user', exp: 9999999999 }),
    });
    global.fetch = fetchMock;

    await expect(
      guard.canActivate(createContext(`Bearer ${createIdToken('2012345678')}`)),
    ).resolves.toBe(true);

    expect(String(fetchMock.mock.calls[0][1].body)).toContain(
      'client_id=2012345678',
    );
  });

  it('accepts a LIFF access token only after verifying its channel', async () => {
    const config = {
      get: jest.fn(() => 'shared-channel'),
    } as unknown as ConfigService;
    const tenantPrisma = {
      tenant: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ liffId: '2012345678-liffapp' }),
      },
    } as unknown as PrismaService;
    const guard = new LiffGuard(config, tenantPrisma);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid id token'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ client_id: '2012345678', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ userId: 'access-token-user' }),
      });
    global.fetch = fetchMock;

    await expect(
      guard.canActivate(createContext('Bearer opaque-access-token')),
    ).resolves.toBe(true);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.line.me/oauth2/v2.1/verify?access_token=opaque-access-token',
    );
    expect(fetchMock.mock.calls[2][1]).toEqual({
      headers: { Authorization: 'Bearer opaque-access-token' },
    });
  });

  it('rejects an access token issued for a different LINE channel', async () => {
    const config = {
      get: jest.fn(() => 'shared-channel'),
    } as unknown as ConfigService;
    const tenantPrisma = {
      tenant: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ liffId: '2012345678-liffapp' }),
      },
    } as unknown as PrismaService;
    const guard = new LiffGuard(config, tenantPrisma);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid id token'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ client_id: 'different-channel', expires_in: 3600 }),
      });

    await expect(
      guard.canActivate(createContext('Bearer wrong-channel-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
