import type {
  EventSocialProofRule,
  EventSocialProofSettings,
  EventSocialProofSizeTier,
} from './api';

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
    { min: 100, enabled: true, label: '100人以上参加予定' },
    { min: 60, enabled: true, label: '60人以上参加予定' },
    { min: 50, enabled: true, label: '50人以上参加予定' },
    { min: 40, enabled: true, label: '40人以上参加予定' },
  ],
  aboveAverage: {
    enabled: true,
    label: 'いつもより参加者多めです！',
    historyCount: 10,
    minimumIncreaseCount: 3,
    minimumIncreasePercent: 10,
  },
};

function normalizeRule(
  value: Partial<EventSocialProofRule> | null | undefined,
  fallback: EventSocialProofRule,
): EventSocialProofRule {
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : fallback.enabled,
    label: typeof value?.label === 'string' && value.label.trim() ? value.label : fallback.label,
  };
}

export function normalizeEventSocialProofSettings(
  value: Partial<EventSocialProofSettings> | null | undefined,
): EventSocialProofSettings {
  const defaults = DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS;
  const savedTiers = Array.isArray(value?.sizeTiers) ? value.sizeTiers : [];
  const sizeTiers: EventSocialProofSizeTier[] = defaults.sizeTiers.map((fallback) => {
    const saved = savedTiers.find((tier) => tier.min === fallback.min);
    return {
      ...fallback,
      ...normalizeRule(saved, fallback),
    };
  });

  return {
    ...defaults,
    ...value,
    balanced: (() => {
      const rule = normalizeRule(value?.balanced, defaults.balanced);
      return rule.label === '男女比ほぼ半々' ? { ...rule, label: defaults.balanced.label } : rule;
    })(),
    femaleHigh: normalizeRule(value?.femaleHigh, defaults.femaleHigh),
    femaleAboveAverage: {
      ...defaults.femaleAboveAverage,
      ...value?.femaleAboveAverage,
      ...normalizeRule(value?.femaleAboveAverage, defaults.femaleAboveAverage),
    },
    ratio32: normalizeRule(value?.ratio32, defaults.ratio32),
    bothGenders: normalizeRule(value?.bothGenders, defaults.bothGenders),
    sizeTiers,
    aboveAverage: {
      ...defaults.aboveAverage,
      ...value?.aboveAverage,
      ...(() => {
        const rule = normalizeRule(value?.aboveAverage, defaults.aboveAverage);
        return rule.label === 'いつもより参加多め'
          ? { ...rule, label: defaults.aboveAverage.label }
          : rule;
      })(),
    },
  };
}
