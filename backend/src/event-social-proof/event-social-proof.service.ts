import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EventSocialProofKind =
  | 'balanced'
  | 'ratio_3_2'
  | 'size'
  | 'combined';

export interface EventSocialProofResult {
  kind: EventSocialProofKind;
  text: string;
}

export interface EventSocialProofRule {
  enabled: boolean;
  label: string;
}

export interface EventSocialProofSettings {
  enabled: boolean;
  minGenderSample: number;
  balanced: EventSocialProofRule;
  ratio32: EventSocialProofRule;
  balanceDifference4To9: number;
  balanceDifference10To39: number;
  balanceDifference40To69: number;
  balanceDifference70To99: number;
  balanceDifference100PlusPercent: number;
  ratio32MinMalePercent: number;
  ratio32MaxMalePercent: number;
  // 「現在◯人参加予定！」を出す最低人数
  minParticipantsForVolume: number;
  // 男女別定員の残り枠（「◯◯残り枠△名」）を具体的な人数で出し始める残数のしきい値
  genderCapacityRevealThreshold: number;
}

export const DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS: EventSocialProofSettings = {
  enabled: true,
  minGenderSample: 4,
  balanced: { enabled: true, label: '男女比半々' },
  ratio32: { enabled: true, label: '男女比約3:2' },
  balanceDifference4To9: 1,
  balanceDifference10To39: 5,
  balanceDifference40To69: 8,
  balanceDifference70To99: 12,
  balanceDifference100PlusPercent: 20,
  ratio32MinMalePercent: 55,
  ratio32MaxMalePercent: 65,
  minParticipantsForVolume: 20,
  genderCapacityRevealThreshold: 20,
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function integerValue(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function labelValue(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().slice(0, 40);
  return normalized || fallback;
}

function normalizeRule(
  value: unknown,
  fallback: EventSocialProofRule,
): EventSocialProofRule {
  const raw = record(value);
  return {
    enabled: booleanValue(raw.enabled, fallback.enabled),
    label: labelValue(raw.label, fallback.label),
  };
}

export function normalizeEventSocialProofSettings(
  value: unknown,
): EventSocialProofSettings {
  const raw = record(value);

  return {
    enabled: booleanValue(
      raw.enabled,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.enabled,
    ),
    minGenderSample: integerValue(
      raw.minGenderSample,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.minGenderSample,
      4,
      100,
    ),
    balanced: (() => {
      const rule = normalizeRule(
        raw.balanced,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.balanced,
      );
      return rule.label === '男女比ほぼ半々'
        ? { ...rule, label: DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.balanced.label }
        : rule;
    })(),
    ratio32: normalizeRule(
      raw.ratio32,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.ratio32,
    ),
    balanceDifference4To9: integerValue(
      raw.balanceDifference4To9,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.balanceDifference4To9,
      0,
      9,
    ),
    balanceDifference10To39: integerValue(
      raw.balanceDifference10To39,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.balanceDifference10To39,
      0,
      39,
    ),
    balanceDifference40To69: integerValue(
      raw.balanceDifference40To69,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.balanceDifference40To69,
      0,
      69,
    ),
    balanceDifference70To99: integerValue(
      raw.balanceDifference70To99,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.balanceDifference70To99,
      0,
      99,
    ),
    balanceDifference100PlusPercent: integerValue(
      raw.balanceDifference100PlusPercent,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.balanceDifference100PlusPercent,
      0,
      50,
    ),
    ratio32MinMalePercent: integerValue(
      raw.ratio32MinMalePercent,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.ratio32MinMalePercent,
      50,
      100,
    ),
    ratio32MaxMalePercent: integerValue(
      raw.ratio32MaxMalePercent,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.ratio32MaxMalePercent,
      50,
      100,
    ),
    minParticipantsForVolume: integerValue(
      raw.minParticipantsForVolume,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.minParticipantsForVolume,
      1,
      1000,
    ),
    genderCapacityRevealThreshold: integerValue(
      raw.genderCapacityRevealThreshold,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.genderCapacityRevealThreshold,
      0,
      1000,
    ),
  };
}

export interface EventSocialProofInput {
  id: string;
  category?: string | null;
  categories?: string[];
  reservations: Array<{ member: { gender: string | null } }>;
}

function balanceTolerance(
  knownGenderCount: number,
  settings: EventSocialProofSettings,
): number {
  if (knownGenderCount < 10) return settings.balanceDifference4To9;
  if (knownGenderCount < 40) return settings.balanceDifference10To39;
  if (knownGenderCount < 70) return settings.balanceDifference40To69;
  if (knownGenderCount < 100) return settings.balanceDifference70To99;
  return Math.floor(
    (knownGenderCount * settings.balanceDifference100PlusPercent) / 100,
  );
}

export function buildEventSocialProof(
  event: EventSocialProofInput,
  settingsValue?: unknown,
): EventSocialProofResult | null {
  const settings = normalizeEventSocialProofSettings(settingsValue);
  if (!settings.enabled) return null;

  const total = event.reservations.length;
  if (total === 0) return null;

  const male = event.reservations.filter(
    (reservation) => reservation.member.gender === '男性',
  ).length;
  const female = event.reservations.filter(
    (reservation) => reservation.member.gender === '女性',
  ).length;
  const knownGenderCount = male + female;
  let gender: { kind: EventSocialProofKind; text: string } | null = null;

  if (knownGenderCount >= settings.minGenderSample) {
    const difference = Math.abs(male - female);
    const balanced = difference <= balanceTolerance(knownGenderCount, settings);
    const malePercent =
      knownGenderCount > 0 ? (male / knownGenderCount) * 100 : 0;

    // 「半々」か「3:2」にはっきり当てはまる時だけ出す。それ以外の偏りは
    // 曖昧になるため何も表示しない。
    if (balanced && settings.balanced.enabled) {
      gender = { kind: 'balanced', text: settings.balanced.label };
    } else if (
      !balanced &&
      male > female &&
      malePercent >= settings.ratio32MinMalePercent &&
      malePercent <= settings.ratio32MaxMalePercent &&
      settings.ratio32.enabled
    ) {
      gender = { kind: 'ratio_3_2', text: settings.ratio32.label };
    }
  }

  const volume: { kind: EventSocialProofKind; text: string } | null =
    total >= settings.minParticipantsForVolume
      ? { kind: 'size', text: `現在${total}人参加予定！` }
      : null;

  if (gender && volume) {
    return { kind: 'combined', text: `${gender.text}\n${volume.text}` };
  }
  if (gender) return gender;
  if (volume) return volume;
  return null;
}

@Injectable()
export class EventSocialProofService {
  constructor(private readonly prisma: PrismaService) {}

  // 合同開催（コラボイベント）の場合、規模間バッジはグループ内の全イベントを
  // 合算した人数で判定する。既存のEvent/Reservationは一切書き換えない。
  async expandForCollab(
    events: EventSocialProofInput[],
  ): Promise<EventSocialProofInput[]> {
    const eventIds = events.map((e) => e.id);
    const links = await this.prisma.collabEventLink.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, collabGroupId: true },
    });
    if (links.length === 0) return events;

    const groupIdByEventId = new Map(
      links.map((l) => [l.eventId, l.collabGroupId]),
    );
    const groupIds = [...new Set(links.map((l) => l.collabGroupId))];
    const allLinksInGroups = await this.prisma.collabEventLink.findMany({
      where: { collabGroupId: { in: groupIds } },
      select: { eventId: true, collabGroupId: true },
    });
    const eventIdsByGroup = new Map<string, string[]>();
    for (const l of allLinksInGroups) {
      const list = eventIdsByGroup.get(l.collabGroupId) ?? [];
      list.push(l.eventId);
      eventIdsByGroup.set(l.collabGroupId, list);
    }

    const reservationsByEventId = new Map<
      string,
      Array<{ member: { gender: string | null } }>
    >(events.map((e) => [e.id, e.reservations]));
    const missingEventIds = [
      ...new Set(allLinksInGroups.map((l) => l.eventId)),
    ].filter((id) => !reservationsByEventId.has(id));
    if (missingEventIds.length > 0) {
      const siblingReservations = await this.prisma.reservation.findMany({
        where: {
          eventId: { in: missingEventIds },
          status: { in: ['reserved', 'attended', 'waiting_payment'] },
        },
        select: { eventId: true, member: { select: { gender: true } } },
      });
      for (const r of siblingReservations) {
        const list = reservationsByEventId.get(r.eventId) ?? [];
        list.push({ member: r.member });
        reservationsByEventId.set(r.eventId, list);
      }
    }

    return events.map((event) => {
      const groupId = groupIdByEventId.get(event.id);
      if (!groupId) return event;
      const memberEventIds = eventIdsByGroup.get(groupId) ?? [event.id];
      const combinedReservations = memberEventIds.flatMap(
        (id) => reservationsByEventId.get(id) ?? [],
      );
      return { ...event, reservations: combinedReservations };
    });
  }

  buildForEvents(
    _tenantId: string,
    settingsValue: unknown,
    events: EventSocialProofInput[],
  ): Map<string, EventSocialProofResult> {
    const settings = normalizeEventSocialProofSettings(settingsValue);
    if (!settings.enabled || events.length === 0) return new Map();

    const result = new Map<string, EventSocialProofResult>();
    for (const event of events) {
      const socialProof = buildEventSocialProof(event, settings);
      if (socialProof) result.set(event.id, socialProof);
    }
    return result;
  }
}
