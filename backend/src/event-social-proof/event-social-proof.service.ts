import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EventSocialProofKind =
  | 'balanced'
  | 'female_high'
  | 'female_above_average'
  | 'ratio_3_2'
  | 'both_genders'
  | 'size'
  | 'above_average'
  | 'combined';

export interface EventSocialProofResult {
  kind: EventSocialProofKind;
  text: string;
}

export interface EventSocialProofRule {
  enabled: boolean;
  label: string;
}

export interface EventSocialProofSizeTier extends EventSocialProofRule {
  min: 40 | 50 | 60 | 100;
}

export interface EventSocialProofSettings {
  enabled: boolean;
  minGenderSample: number;
  balanced: EventSocialProofRule;
  femaleHigh: EventSocialProofRule;
  femaleAboveAverage: EventSocialProofRule & {
    historyCount: number;
    minimumIncreasePercentagePoints: number;
  };
  ratio32: EventSocialProofRule;
  bothGenders: EventSocialProofRule;
  balanceDifference4To9: number;
  balanceDifference10To39: number;
  balanceDifference40To69: number;
  balanceDifference70To99: number;
  balanceDifference100PlusPercent: number;
  ratio32MinMalePercent: number;
  ratio32MaxMalePercent: number;
  sizeTiers: EventSocialProofSizeTier[];
  aboveAverage: EventSocialProofRule & {
    historyCount: number;
    minimumIncreaseCount: number;
    minimumIncreasePercent: number;
  };
}

export const DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS: EventSocialProofSettings = {
  enabled: true,
  minGenderSample: 4,
  balanced: { enabled: true, label: '男女比半々' },
  femaleHigh: { enabled: true, label: '女性参加率高め！' },
  femaleAboveAverage: {
    enabled: true,
    label: 'いつもより女性参加率高めです！',
    historyCount: 10,
    minimumIncreasePercentagePoints: 10,
  },
  ratio32: { enabled: true, label: '男女比約3:2' },
  bothGenders: { enabled: true, label: '男女とも参加予定' },
  balanceDifference4To9: 1,
  balanceDifference10To39: 5,
  balanceDifference40To69: 8,
  balanceDifference70To99: 12,
  balanceDifference100PlusPercent: 20,
  ratio32MinMalePercent: 55,
  ratio32MaxMalePercent: 65,
  sizeTiers: [
    {
      min: 100,
      enabled: true,
      label: '100人以上参加予定',
    },
    {
      min: 60,
      enabled: true,
      label: '60人以上参加予定',
    },
    {
      min: 50,
      enabled: true,
      label: '50人以上参加予定',
    },
    {
      min: 40,
      enabled: true,
      label: '40人以上参加予定',
    },
  ],
  aboveAverage: {
    enabled: true,
    label: 'いつもより参加者多めです！',
    historyCount: 10,
    minimumIncreaseCount: 3,
    minimumIncreasePercent: 10,
  },
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
  const rawTiers = Array.isArray(raw.sizeTiers)
    ? raw.sizeTiers.map(record)
    : [];
  const sizeTiers = DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.sizeTiers.map(
    (fallback) => {
      const saved =
        rawTiers.find((tier) => Number(tier.min) === fallback.min) ?? {};
      return {
        min: fallback.min,
        enabled: booleanValue(saved.enabled, fallback.enabled),
        label: labelValue(saved.label, fallback.label),
      };
    },
  );
  const aboveAverage = record(raw.aboveAverage);
  const femaleAboveAverage = record(raw.femaleAboveAverage);

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
    femaleHigh: normalizeRule(
      raw.femaleHigh,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.femaleHigh,
    ),
    femaleAboveAverage: {
      ...normalizeRule(
        femaleAboveAverage,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.femaleAboveAverage,
      ),
      historyCount: integerValue(
        femaleAboveAverage.historyCount,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.femaleAboveAverage.historyCount,
        3,
        30,
      ),
      minimumIncreasePercentagePoints: integerValue(
        femaleAboveAverage.minimumIncreasePercentagePoints,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.femaleAboveAverage.minimumIncreasePercentagePoints,
        1,
        50,
      ),
    },
    ratio32: normalizeRule(
      raw.ratio32,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.ratio32,
    ),
    bothGenders: normalizeRule(
      raw.bothGenders,
      DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.bothGenders,
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
    sizeTiers,
    aboveAverage: {
      ...(() => {
        const rule = normalizeRule(
          aboveAverage,
          DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.aboveAverage,
        );
        return rule.label === 'いつもより参加多め'
          ? { ...rule, label: DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.aboveAverage.label }
          : rule;
      })(),
      historyCount: integerValue(
        aboveAverage.historyCount,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.aboveAverage.historyCount,
        3,
        30,
      ),
      minimumIncreaseCount: integerValue(
        aboveAverage.minimumIncreaseCount,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.aboveAverage.minimumIncreaseCount,
        1,
        100,
      ),
      minimumIncreasePercent: integerValue(
        aboveAverage.minimumIncreasePercent,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS.aboveAverage.minimumIncreasePercent,
        0,
        100,
      ),
    },
  };
}

export interface EventSocialProofInput {
  id: string;
  category?: string | null;
  categories?: string[];
  reservations: Array<{ member: { gender: string | null } }>;
}

export interface EventSocialProofHistory {
  category?: string | null;
  categories?: string[];
  reservedCount: number;
  maleCount?: number;
  femaleCount?: number;
}

function categorySet(event: {
  category?: string | null;
  categories?: string[];
}): Set<string> {
  return new Set(
    [event.category, ...(event.categories ?? [])].filter(
      (value): value is string => !!value,
    ),
  );
}

function relevantHistory(
  event: EventSocialProofInput,
  history: EventSocialProofHistory[],
): EventSocialProofHistory[] {
  const currentCategories = categorySet(event);
  if (currentCategories.size === 0) return history;
  const matching = history.filter((past) => {
    for (const category of categorySet(past)) {
      if (currentCategories.has(category)) return true;
    }
    return false;
  });
  return matching.length >= 3 ? matching : history;
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
  history: EventSocialProofHistory[],
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
  const comparisonHistory = relevantHistory(event, history);
  let gender: { kind: EventSocialProofKind; text: string } | null = null;

  if (knownGenderCount >= settings.minGenderSample) {
    const difference = Math.abs(male - female);
    const balanced = difference <= balanceTolerance(knownGenderCount, settings);
    const malePercent =
      knownGenderCount > 0 ? (male / knownGenderCount) * 100 : 0;
    const femalePercent =
      knownGenderCount > 0 ? (female / knownGenderCount) * 100 : 0;

    if (settings.femaleAboveAverage.enabled) {
      const genderHistory = comparisonHistory
        .filter((past) => (past.maleCount ?? 0) + (past.femaleCount ?? 0) > 0)
        .slice(0, settings.femaleAboveAverage.historyCount);
      if (genderHistory.length >= 3) {
        const historicalFemale = genderHistory.reduce(
          (sum, past) => sum + (past.femaleCount ?? 0),
          0,
        );
        const historicalKnown = genderHistory.reduce(
          (sum, past) => sum + (past.maleCount ?? 0) + (past.femaleCount ?? 0),
          0,
        );
        const historicalFemalePercent = historicalKnown > 0
          ? (historicalFemale / historicalKnown) * 100
          : 0;
        if (
          femalePercent >=
          historicalFemalePercent +
            settings.femaleAboveAverage.minimumIncreasePercentagePoints
        ) {
          gender = {
            kind: 'female_above_average',
            text: settings.femaleAboveAverage.label,
          };
        }
      }
    }

    if (!gender && balanced && settings.balanced.enabled) {
      gender = { kind: 'balanced', text: settings.balanced.label };
    } else if (!gender && !balanced && female > male && settings.femaleHigh.enabled) {
      gender = { kind: 'female_high', text: settings.femaleHigh.label };
    } else if (
      !gender &&
      !balanced &&
      male > female &&
      malePercent >= settings.ratio32MinMalePercent &&
      malePercent <= settings.ratio32MaxMalePercent &&
      settings.ratio32.enabled
    ) {
      gender = { kind: 'ratio_3_2', text: settings.ratio32.label };
    } else if (!gender && male > 0 && female > 0 && settings.bothGenders.enabled) {
      gender = { kind: 'both_genders', text: settings.bothGenders.label };
    }
  }

  const sizeTier = settings.sizeTiers
    .filter((tier) => tier.enabled && total >= tier.min)
    .sort((a, b) => b.min - a.min)[0];
  let volume: {
    kind: EventSocialProofKind;
    text: string;
  } | null = sizeTier
    ? {
        kind: 'size',
        text: sizeTier.label,
      }
    : null;

  if (!volume && settings.aboveAverage.enabled) {
    const comparison = comparisonHistory.slice(
      0,
      settings.aboveAverage.historyCount,
    );
    if (comparison.length >= 3) {
      const average =
        comparison.reduce((sum, past) => sum + past.reservedCount, 0) /
        comparison.length;
      const enoughByCount =
        total >= average + settings.aboveAverage.minimumIncreaseCount;
      const enoughByRate =
        total >=
        average * (1 + settings.aboveAverage.minimumIncreasePercent / 100);
      if (enoughByCount && enoughByRate) {
        volume = {
          kind: 'above_average',
          text: settings.aboveAverage.label,
        };
      }
    }
  }

  if (gender && volume) {
    return { kind: 'combined', text: `${gender.text}\n${volume.text}` };
  }
  if (gender) return gender;
  if (volume) return { kind: volume.kind, text: volume.text };
  return null;
}

@Injectable()
export class EventSocialProofService {
  constructor(private readonly prisma: PrismaService) {}

  async buildForEvents(
    tenantId: string,
    settingsValue: unknown,
    events: EventSocialProofInput[],
  ): Promise<Map<string, EventSocialProofResult>> {
    const settings = normalizeEventSocialProofSettings(settingsValue);
    if (!settings.enabled || events.length === 0) return new Map();

    let history: EventSocialProofHistory[] = [];
    if (settings.aboveAverage.enabled || settings.femaleAboveAverage.enabled) {
      const historicalEvents = await this.prisma.event.findMany({
        where: {
          tenantId,
          status: { not: 'draft' },
          heldAt: { lt: new Date() },
        },
        orderBy: { heldAt: 'desc' },
        take: Math.min(
          100,
          Math.max(
            30,
            Math.max(
              settings.aboveAverage.historyCount,
              settings.femaleAboveAverage.historyCount,
            ) * 5,
          ),
        ),
        select: {
          category: true,
          categories: true,
          reservations: {
            where: {
              status: { in: ['reserved', 'attended', 'waiting_payment'] },
            },
            select: {
              member: { select: { gender: true } },
            },
          },
        },
      });
      history = historicalEvents.map((event) => ({
        category: event.category,
        categories: event.categories,
        reservedCount: event.reservations.length,
        maleCount: event.reservations.filter(
          (reservation) => reservation.member.gender === '男性',
        ).length,
        femaleCount: event.reservations.filter(
          (reservation) => reservation.member.gender === '女性',
        ).length,
      }));
    }

    const result = new Map<string, EventSocialProofResult>();
    for (const event of events) {
      const socialProof = buildEventSocialProof(event, history, settings);
      if (socialProof) result.set(event.id, socialProof);
    }
    return result;
  }
}
