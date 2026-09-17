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
  it('treats a 60:40 split at 100 known attendees as balanced', () => {
    expect(
      buildEventSocialProof(
        event(60, 40),
        [],
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
      )?.text,
    ).toBe('男女比ほぼ半々の100人規模');
  });

  it('uses the 3:2 label below 100 when the configured balance difference is exceeded', () => {
    expect(
      buildEventSocialProof(
        event(30, 20),
        [],
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
      )?.text,
    ).toBe('男女比約3:2の50人規模');
  });

  it('shows the female-high label only outside the balanced tolerance', () => {
    expect(
      buildEventSocialProof(
        event(10, 20),
        [],
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
      )?.text,
    ).toBe('女性参加率高め！');
  });

  it('combines the female-high and size labels without awkward punctuation', () => {
    expect(
      buildEventSocialProof(
        event(15, 35),
        [],
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
      )?.text,
    ).toBe('女性参加率高め！ 50人以上参加予定');
  });

  it('uses a generic non-gender label for very small attendance', () => {
    expect(
      buildEventSocialProof(
        event(0, 1),
        [],
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
      )?.text,
    ).toBe('参加予定あり');
  });

  it('uses the above-average label below the size tiers', () => {
    const history = Array.from({ length: 10 }, () => ({
      category: 'バドミントン',
      categories: ['バドミントン'],
      reservedCount: 10,
    }));
    expect(
      buildEventSocialProof(
        event(10, 8),
        history,
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
      )?.text,
    ).toBe('男女比ほぼ半々・いつもより参加多め');
  });

  it('returns no label when the feature is disabled or nobody has reserved', () => {
    expect(
      buildEventSocialProof(
        event(0, 0),
        [],
        DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
      ),
    ).toBeNull();
    expect(
      buildEventSocialProof(event(2, 2), [], {
        ...DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
        enabled: false,
      }),
    ).toBeNull();
  });
});
