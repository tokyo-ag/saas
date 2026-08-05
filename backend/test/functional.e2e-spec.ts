/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-argument */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { LineMessagingService } from '../src/line-messaging/line-messaging.service';
import { StripeService } from '../src/stripe/stripe.service';

type MockPrisma = ReturnType<typeof createPrismaMock>;

const now = new Date('2026-06-01T10:00:00.000Z');
const futureDate = new Date('2026-07-01T10:00:00.000Z');

function createIdToken(aud = '2000000000') {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ aud, exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;
}

function createPrismaMock() {
  const state = {
    tenant: {
      id: 'tenant-1',
      code: '12345678',
      name: 'COMIU Club',
      description: 'Public tenant description',
      liffId: '2000000000-testliff',
      lineDisplayName: 'COMIU LINE',
      linePictureUrl: 'https://example.com/tenant-line.png',
      iconUrl: 'https://example.com/tenant-icon.png',
      lineChannelId: 'line-channel',
      lineChannelSecret: 'line-webhook-secret',
      lineChannelAccessToken: '',
      liffEventView: 'list',
      themeColor: 'green',
      plan: 'standard',
      stripeSecretKey: null,
      stripeWebhookSecret: 'whsec_tenant_test',
      organizerLineUserId: 'organizer-line',
      updatedAt: now,
      deletedAt: null,
      bannedAt: null,
    },
    account: {
      id: 'account-1',
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      emailVerifiedAt: now,
      passwordHash: '',
      lineUserId: 'line-existing',
    },
    member: {
      id: 'member-1',
      tenantId: 'tenant-1',
      lineUserId: 'line-from-token',
      name: 'Existing Member',
      grade: '3',
      gender: 'other',
      lineDisplayName: 'Token User',
      linePictureUrl: 'https://example.com/member.png',
      showEventsToConnections: true,
      blockedAt: null,
    },
    createdReservation: null as null | { data: Record<string, unknown> },
    createdTenant: null as null | Record<string, unknown>,
    upsertedMemberLineUserId: null as null | string,
  };

  const prisma = {
    __state: state,
    tenant: {
      findUnique: jest.fn(
        async (args?: { where?: { id?: string; code?: string } }) => {
          if (
            args?.where?.id === state.tenant.id ||
            args?.where?.code === state.tenant.code
          ) {
            return state.tenant;
          }
          return null;
        },
      ),
      findFirst: jest.fn(
        async (args?: {
          where?: { OR?: Array<{ id?: string; code?: string }> };
        }) => {
          const conditions = args?.where?.OR ?? [];
          if (
            conditions.length === 0 ||
            conditions.some(
              (condition) =>
                condition.id === state.tenant.id ||
                condition.code === state.tenant.code,
            )
          ) {
            return state.tenant;
          }
          return null;
        },
      ),
      findMany: jest.fn(async () => [
        {
          ...state.tenant,
          _count: { members: 12, events: 2, liffAccesses: 4 },
        },
      ]),
      create: jest.fn(async (args: { data: Record<string, unknown> }) => {
        const account = {
          id: 'line-created-account',
          tenantId: 'tenant-created',
          lineUserId: 'line-new',
        };
        const tenant = {
          id: 'tenant-created',
          name: args.data.name,
          code: '87654321',
          organizerAccounts: [account],
        };
        state.createdTenant = tenant;
        return tenant;
      }),
      update: jest.fn(async (args: { data: Partial<typeof state.tenant> }) => {
        Object.assign(state.tenant, args.data);
        return state.tenant;
      }),
    },
    organizerAccount: {
      findFirst: jest.fn(async () => state.account),
      findUnique: jest.fn(async (args?: { where?: Record<string, string> }) => {
        if (args?.where?.lineUserId === 'line-existing') return state.account;
        if (args?.where?.id === state.account.id) return state.account;
        return null;
      }),
      update: jest.fn(async () => state.account),
    },
    pendingRegistration: {
      findUnique: jest.fn(async () => null),
      findFirst: jest.fn(async () => null),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    event: {
      findMany: jest.fn(async () => [
        {
          id: 'event-1',
          tenantId: state.tenant.id,
          title: 'Future Event',
          description: 'Event description',
          heldAt: futureDate,
          endAt: null,
          location: 'Tokyo',
          locationUrl: 'https://example.com/map',
          price: 3000,
          priceMale: 3500,
          priceFemale: 2500,
          paymentRequired: false,
          capacity: 20,
          status: 'open',
          imageUrl: 'https://example.com/event.png',
          iconUrl: 'https://example.com/event-icon.png',
          category: '交流会',
          tags: ['初参加歓迎'],
          viewCount: 9,
          updatedAt: now,
          notifyOnReserve: false,
          notifyOnReserveApp: false,
          tenant: {
            id: state.tenant.id,
            code: state.tenant.code,
            name: state.tenant.name,
            lineDisplayName: state.tenant.lineDisplayName,
            linePictureUrl: state.tenant.linePictureUrl,
            iconUrl: state.tenant.iconUrl,
            _count: { liffAccesses: 4 },
          },
          reservations: [{ id: 'reservation-existing' }],
        },
      ]),
      findFirst: jest.fn(async () => ({
        id: 'event-1',
        tenantId: state.tenant.id,
        title: 'Future Event',
        description: 'Event description',
        heldAt: futureDate,
        endAt: null,
        location: 'Tokyo',
        locationUrl: 'https://example.com/map',
        price: 3000,
        priceMale: null,
        priceFemale: null,
        paymentRequired: false,
        capacity: 20,
        status: 'open',
        imageUrl: 'https://example.com/event.png',
        iconUrl: null,
        category: '交流会',
        tags: ['初参加歓迎'],
        viewCount: 9,
        notifyOnReserve: false,
        notifyOnReserveApp: false,
        tenant: {
          code: state.tenant.code,
          name: state.tenant.name,
          lineDisplayName: state.tenant.lineDisplayName,
          linePictureUrl: state.tenant.linePictureUrl,
          iconUrl: state.tenant.iconUrl,
        },
        reservations: [{ id: 'reservation-existing' }],
        reviews: [],
      })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(),
    },
    reservation: {
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async (args: { data: Record<string, unknown> }) => {
        state.createdReservation = args;
        return {
          id: 'reservation-created',
          ...args.data,
          reservedAt: now,
        };
      }),
      update: jest.fn(),
      updateMany: jest.fn(async () => ({ count: 1 })),
      aggregate: jest.fn(async () => ({ _max: { waitlistOrder: null } })),
    },
    member: {
      count: jest.fn(async () => 1),
      findUnique: jest.fn(async () => null),
      findFirst: jest.fn(async () => state.member),
      findMany: jest.fn(async () => []),
      create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
        id: 'member-created',
        blockedAt: null,
        showEventsToConnections: true,
        ...args.data,
      })),
      update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
        ...state.member,
        ...args.data,
      })),
      upsert: jest.fn(async (args: { create: { lineUserId: string } }) => {
        state.upsertedMemberLineUserId = args.create.lineUserId;
        return state.member;
      }),
    },
    bannedLineUser: {
      findUnique: jest.fn(async () => null),
    },
    tenantLiffAccess: {
      create: jest.fn(async () => ({ id: 'access-1' })),
    },
    eventReview: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(),
    },
    connection: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
      create: jest.fn(),
    },
    message: {
      findMany: jest.fn(async () => []),
      create: jest.fn(),
    },
    notification: {
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    adminMemberMessage: {
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    supportMessage: {
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    errorLog: {
      create: jest.fn(),
    },
  };

  return prisma;
}

describe('Core feature flows (e2e)', () => {
  let app: INestApplication;
  let prisma: MockPrisma;
  let jwtService: JwtService;
  let fetchMock: jest.Mock;
  let stripeServiceMock: {
    createCheckoutSession: jest.Mock;
    constructEvent: jest.Mock;
  };
  const originalFetch = global.fetch;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'functional-test-secret';
    process.env.BACKEND_URL = 'http://backend.test';
    process.env.FRONTEND_URL = 'http://frontend.test';
    process.env.LINE_LOGIN_CHANNEL_ID = '1000000000';
    process.env.LINE_LOGIN_CHANNEL_SECRET = 'line-secret';
    process.env.LIFF_CHANNEL_ID = '2000000000';
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.__state.account.passwordHash = await bcrypt.hash('Password123', 6);
    fetchMock = jest.fn();
    stripeServiceMock = {
      createCheckoutSession: jest.fn(),
      constructEvent: jest.fn(),
    };
    global.fetch = fetchMock as unknown as typeof fetch;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EmailService)
      .useValue({
        sendVerificationEmail: jest.fn(),
        sendPasswordResetEmail: jest.fn(),
      })
      .overrideProvider(LineMessagingService)
      .useValue({
        getLineProfile: jest.fn(async () => null),
        sendReservationConfirm: jest.fn(),
        sendWaitlistRegistered: jest.fn(),
        sendWaitlistPromoted: jest.fn(),
        sendCancelNotifyToOrganizer: jest.fn(),
        sendRemind: jest.fn(),
        sendTalkNotification: jest.fn(),
      })
      .overrideProvider(StripeService)
      .useValue(stripeServiceMock)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('keeps email login and authenticated admin profile working', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ADMIN@example.com', password: 'Password123' })
      .expect(201);

    expect(login.body).toMatchObject({
      tenantId: 'tenant-1',
      emailVerified: true,
    });
    expect(login.body.token).toEqual(expect.any(String));

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);

    expect(me.body).toMatchObject({
      tenantId: 'tenant-1',
      accountId: 'account-1',
      email: 'admin@example.com',
      emailVerified: true,
      hasPassword: true,
    });
  });

  it('keeps LINE Login redirect and existing-account callback working', async () => {
    const start = await request(app.getHttpServer())
      .get('/api/auth/line')
      .expect(302);
    const lineUrl = new URL(start.headers.location);
    const state = lineUrl.searchParams.get('state');

    expect(lineUrl.origin).toBe('https://access.line.me');
    expect(lineUrl.searchParams.get('client_id')).toBe('1000000000');
    expect(lineUrl.searchParams.get('redirect_uri')).toBe(
      'http://backend.test/api/auth/line/callback',
    );
    expect(state).toEqual(expect.any(String));

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'line-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'line-existing',
          displayName: 'Existing LINE User',
        }),
      });

    const callback = await request(app.getHttpServer())
      .get(`/api/auth/line/callback?code=valid-code&state=${state}`)
      .expect(302);
    const redirectUrl = new URL(callback.headers.location);

    expect(redirectUrl.origin).toBe('http://frontend.test');
    expect(redirectUrl.pathname).toBe('/auth/callback');
    expect(redirectUrl.searchParams.get('token')).toEqual(expect.any(String));
  });

  it('keeps LINE new-account registration completion working', async () => {
    const state = jwtService.sign({ ts: Date.now() }, { expiresIn: '10m' });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'line-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userId: 'line-new', displayName: 'New User' }),
      });

    const callback = await request(app.getHttpServer())
      .get(`/api/auth/line/callback?code=valid-code&state=${state}`)
      .expect(302);
    const redirectUrl = new URL(callback.headers.location);

    expect(redirectUrl.pathname).toBe('/register/line');
    const lineToken = redirectUrl.searchParams.get('lineToken');
    expect(lineToken).toEqual(expect.any(String));

    const completed = await request(app.getHttpServer())
      .post('/api/auth/line/complete')
      .send({ lineToken, orgName: 'New Organization' })
      .expect(201);

    expect(completed.body).toMatchObject({ tenantId: 'tenant-created' });
    expect(completed.body.token).toEqual(expect.any(String));
    expect(prisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Organization',
          organizerAccounts: {
            create: { lineUserId: 'line-new' },
          },
        }),
      }),
    );
  });

  it('keeps public SEO event listing mapped to safe public fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/events')
      .expect(200);

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'open',
          tenant: expect.objectContaining({
            deletedAt: null,
            bannedAt: null,
            code: { not: null },
          }),
        }),
      }),
    );
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 'event-1',
        tenantCode: '12345678',
        title: 'Future Event',
        reservedCount: 1,
        tenantAccessCount: 4,
        tenant: expect.objectContaining({
          name: 'COMIU Club',
          lineDisplayName: 'COMIU LINE',
        }),
      }),
    ]);
    expect(response.body[0]).not.toHaveProperty('lineChannelAccessToken');
  });

  it('keeps LIFF protected routes requiring a verified LINE id token', async () => {
    await request(app.getHttpServer())
      .post('/api/liff/12345678/join')
      .expect(401);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: 'line-from-token',
        exp: Math.floor(Date.now() / 1000) + 600,
        aud: '2000000000',
      }),
    });

    const response = await request(app.getHttpServer())
      .post('/api/liff/12345678/join')
      .set('Authorization', `Bearer ${createIdToken()}`)
      .send({
        lineUserId: 'spoofed-line-user',
        lineDisplayName: 'Token User',
        linePictureUrl: 'https://example.com/member.png',
      })
      .expect(201);

    const verifyRequest = fetchMock.mock.calls[0];
    expect(verifyRequest[0]).toBe('https://api.line.me/oauth2/v2.1/verify');
    expect(String(verifyRequest[1].body)).toContain('client_id=2000000000');
    expect(prisma.__state.upsertedMemberLineUserId).toBe('line-from-token');
    expect(response.body).toMatchObject({
      id: 'member-1',
      name: 'Existing Member',
      showEventsToConnections: true,
    });
  });

  it('keeps LIFF reservation creation using the verified token user', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: 'line-from-token',
        exp: Math.floor(Date.now() / 1000) + 600,
        aud: '2000000000',
      }),
    });

    const response = await request(app.getHttpServer())
      .post('/api/liff/12345678/reservations')
      .set('Authorization', `Bearer ${createIdToken()}`)
      .send({
        eventId: 'event-1',
        name: 'Reserved User',
        grade: '3',
        gender: 'other',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'reservation-created',
      status: 'reserved',
      waitlistOrder: null,
    });
    expect(prisma.__state.createdReservation?.data).toMatchObject({
      tenantId: 'tenant-1',
      eventId: 'event-1',
      memberId: 'member-created',
      status: 'reserved',
    });
    expect(prisma.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lineUserId: 'line-from-token' }),
      }),
    );
  });

  it('keeps LINE Official Account webhooks behind signature verification', async () => {
    const rawBody = JSON.stringify({
      events: [
        {
          type: 'follow',
          source: { type: 'user', userId: 'line-webhook-user' },
        },
      ],
    });
    const signature = crypto
      .createHmac('sha256', 'line-webhook-secret')
      .update(rawBody)
      .digest('base64');

    await request(app.getHttpServer())
      .post('/api/webhook/tenant-1')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', signature)
      .send(rawBody)
      .expect(200);

    expect(prisma.member.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_lineUserId: {
            tenantId: 'tenant-1',
            lineUserId: 'line-webhook-user',
          },
        },
        create: { tenantId: 'tenant-1', lineUserId: 'line-webhook-user' },
      }),
    );

    await request(app.getHttpServer())
      .post('/api/webhook/tenant-1')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', 'invalid-signature')
      .send(rawBody)
      .expect(401);
  });

  it('keeps Stripe reservation webhooks behind signature verification', async () => {
    stripeServiceMock.constructEvent.mockImplementationOnce(() => {
      throw new Error('bad signature');
    });

    await request(app.getHttpServer())
      .post('/api/stripe-webhook/tenant-1')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'bad-signature')
      .send('{}')
      .expect(400);
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();

    const reservationId = '11111111-1111-4111-8111-111111111111';
    stripeServiceMock.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: { reservationId },
          payment_intent: 'pi_test_123',
        },
      },
    });

    await request(app.getHttpServer())
      .post('/api/stripe-webhook/tenant-1')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid-signature')
      .send('{}')
      .expect(200);

    expect(stripeServiceMock.constructEvent).toHaveBeenLastCalledWith(
      'whsec_tenant_test',
      expect.any(Buffer),
      'valid-signature',
    );
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: reservationId, tenantId: 'tenant-1' },
      data: {
        status: 'reserved',
        paidAt: expect.any(Date),
        stripePaymentIntentId: 'pi_test_123',
      },
    });
  });
});
