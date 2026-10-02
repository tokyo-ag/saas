import {
  buildEventSocialProof,
  DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
  EventSocialProofInput,
} from './event-social-proof.service';

function event(
  male: number,
  female: number,
  unknown = 0,
): EventSocialProofInput {
  return {
    id: 'event-1',
    category: 'バドミントン',
    categories: ['バドミントン'],
    reservations: [
      ...Array.from({ length: male }, () => ({ member: { gender: '男性' } })),
      ...Array.from({ length: female }, () => ({ member: { gender: '女性' } })),
      ...Array.from({ length: unknown }, () => ({ member: { gender: null } })),
    ],
  };
}

describe('event social proof', () => {
  it('treats a 60:40 split at 100 known attendees as balanced, combined with the current headcount', () => {
    expect(
      buildEventSocialProof(event(60, 40), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS)
        ?.text,
    ).toBe('男女比半々\n現在100人参加予定！');
  });

  it('uses the 3:2 label when the configured balance difference is exceeded', () => {
    expect(
      buildEventSocialProof(event(30, 20), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS)
        ?.text,
    ).toBe('男女比約3:2\n現在50人参加予定！');
  });

  it('hides the gender line when the skew does not match balanced or 3:2 (female-leaning)', () => {
    expect(
      buildEventSocialProof(event(10, 20), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS)
        ?.text,
    ).toBe('現在30人参加予定！');
  });

  it('hides the gender line when male-leaning but outside the 3:2 range', () => {
    expect(
      buildEventSocialProof(event(27, 3), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS)
        ?.text,
    ).toBe('現在30人参加予定！');
  });

  it('shows nothing when attendance is below both thresholds', () => {
    expect(
      buildEventSocialProof(event(0, 1), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS),
    ).toBeNull();
  });

  it('shows only the gender line when below the volume threshold', () => {
    expect(
      buildEventSocialProof(event(5, 5), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS)
        ?.text,
    ).toBe('男女比半々');
  });

  it('shows only the current headcount once the volume threshold is reached without a clear gender signal', () => {
    expect(
      buildEventSocialProof(event(14, 6), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS)
        ?.text,
    ).toBe('現在20人参加予定！');
  });

  it('does not show the headcount line one person below the configured minimum', () => {
    expect(
      buildEventSocialProof(event(0, 19), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS),
    ).toBeNull();
  });

  it('returns no label when the feature is disabled or nobody has reserved', () => {
    expect(
      buildEventSocialProof(event(0, 0), DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS),
    ).toBeNull();
    expect(
      buildEventSocialProof(event(20, 20), {
        ...DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
        enabled: false,
      }),
    ).toBeNull();
  });
});
