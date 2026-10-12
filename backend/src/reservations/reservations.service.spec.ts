import { ConflictException } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { ReservationsService } from './reservations.service';

describe('ReservationsService identity invariants', () => {
  it('does not reactivate a cancelled duplicate when an active reservation exists', async () => {
    const prisma = {
      reservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'reservation-old',
          tenantId: 'tenant-1',
          eventId: 'event-1',
          memberId: 'member-1',
          status: ReservationStatus.cancelled,
          member: { id: 'member-1' },
          event: { id: 'event-1' },
        }),
        update: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        ),
      },
    };
    const service = new ReservationsService(prisma as never, {} as never);

    await expect(
      service.updateStatus(
        'tenant-1',
        'reservation-old',
        ReservationStatus.reserved,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('sends the reservation confirmation when a pending application is approved', async () => {
    const reservation = {
      id: 'pending-1',
      tenantId: 'tenant-1',
      eventId: 'event-1',
      status: ReservationStatus.pending_approval,
      member: { name: '田中', lineUserId: 'line-1', gender: '女性' },
      event: {
        title: '交流会',
        heldAt: new Date('2026-10-20T10:00:00Z'),
        endAt: null,
        location: '会場',
        locationUrl: null,
        price: 1000,
        priceMale: null,
        priceFemale: null,
        description: null,
        descriptionMale: null,
        descriptionFemale: null,
        maleDelayMinutes: null,
        reservationMessageTemplate: null,
        capacity: null,
        capacityMale: null,
        capacityFemale: null,
        bellGenderRatioAuto: false,
      },
    };
    const prisma = {
      reservation: {
        findFirst: jest.fn().mockResolvedValue(reservation),
        update: jest.fn().mockResolvedValue({
          ...reservation,
          status: ReservationStatus.reserved,
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          lineChannelAccessToken: 'token',
          reservationMessageTemplate: null,
        }),
      },
    };
    const lineMessaging = {
      sendReservationConfirm: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReservationsService(prisma as never, lineMessaging as never);

    await service.updateStatus('tenant-1', 'pending-1', ReservationStatus.reserved);

    expect(lineMessaging.sendReservationConfirm).toHaveBeenCalledWith(
      'token',
      'line-1',
      '交流会',
      expect.any(Date),
      '会場',
      1000,
      null,
      null,
      expect.objectContaining({ gender: '女性' }),
    );
  });

  it('sends a cancellation notice to a pending applicant when rejected', async () => {
    const reservation = {
      id: 'pending-1',
      tenantId: 'tenant-1',
      eventId: 'event-1',
      status: ReservationStatus.pending_approval,
      member: { name: '田中', lineUserId: 'line-1', gender: '男性' },
      event: { id: 'event-1', title: '交流会' },
    };
    const prisma = {
      reservation: {
        findFirst: jest.fn().mockResolvedValue(reservation),
        update: jest.fn().mockResolvedValue({
          ...reservation,
          status: ReservationStatus.cancelled,
        }),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ lineChannelAccessToken: 'token' }),
      },
    };
    const lineMessaging = {
      sendReservationCancelled: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReservationsService(prisma as never, lineMessaging as never);

    await service.updateStatus('tenant-1', 'pending-1', ReservationStatus.cancelled);

    expect(lineMessaging.sendReservationCancelled).toHaveBeenCalledWith(
      'token',
      'line-1',
      '交流会',
    );
  });

  it('does not auto-promote a waitlisted reservation after a cancellation', async () => {
    const prisma = {
      reservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'reservation-1',
          tenantId: 'tenant-1',
          eventId: 'event-1',
          memberId: 'member-1',
          status: ReservationStatus.reserved,
          member: { id: 'member-1', name: '田中' },
          event: { id: 'event-1', title: '交流会' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'reservation-1',
          status: ReservationStatus.cancelled,
        }),
        count: jest.fn(),
      },
      event: { findUnique: jest.fn() },
      tenant: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const lineMessaging = {
      sendWaitlistPromoted: jest.fn(),
      sendCancelNotifyToOrganizer: jest.fn(),
    };
    const service = new ReservationsService(
      prisma as never,
      lineMessaging as never,
    );

    await expect(
      service.updateStatus(
        'tenant-1',
        'reservation-1',
        ReservationStatus.cancelled,
      ),
    ).resolves.toEqual({
      id: 'reservation-1',
      status: ReservationStatus.cancelled,
    });
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
    expect(prisma.reservation.count).not.toHaveBeenCalled();
    expect(lineMessaging.sendWaitlistPromoted).not.toHaveBeenCalled();
  });
});
