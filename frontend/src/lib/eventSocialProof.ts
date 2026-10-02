import type { EventSocialProofRule, EventSocialProofSettings } from './api';

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

function normalizeRule(
  value: Partial<EventSocialProofRule> | null | undefined,
  fallback: EventSocialProofRule,
): EventSocialProofRule {
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : fallback.enabled,
    label: typeof value?.label === 'string' && value.label.trim() ? value.label : fallback.label,
  };
}

function normalizeNumber(
  value: number | null | undefined,
  fallback: number,
): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeEventSocialProofSettings(
  value: Partial<EventSocialProofSettings> | null | undefined,
): EventSocialProofSettings {
  const defaults = DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS;

  return {
    ...defaults,
    ...value,
    balanced: (() => {
      const rule = normalizeRule(value?.balanced, defaults.balanced);
      return rule.label === '男女比ほぼ半々' ? { ...rule, label: defaults.balanced.label } : rule;
    })(),
    ratio32: normalizeRule(value?.ratio32, defaults.ratio32),
    minParticipantsForVolume: normalizeNumber(
      value?.minParticipantsForVolume,
      defaults.minParticipantsForVolume,
    ),
    genderCapacityRevealThreshold: normalizeNumber(
      value?.genderCapacityRevealThreshold,
      defaults.genderCapacityRevealThreshold,
    ),
  };
}
