import { LineMessagingService } from './line-messaging.service';

describe('LineMessagingService event templates', () => {
  it('formats the date, gender prices, and optional map for reminders', async () => {
    const service = new LineMessagingService();
    const sendPushMessage = jest
      .spyOn(service, 'sendPushMessage')
      .mockResolvedValue(undefined);

    await service.sendRemind(
      'token',
      'U123',
      '新歓',
      new Date('2026-07-23T08:00:00.000Z'),
      '東京都豊島区西池袋3-31-5 パークハイムウエスト2F',
      '{date}\n参加費→{price}\n{location}',
      {
        endAt: new Date('2026-07-23T13:00:00.000Z'),
        locationUrl: 'https://maps.example.com/bell',
        price: 0,
        priceMale: 3000,
        priceFemale: 1000,
      },
    );

    expect(sendPushMessage).toHaveBeenCalledWith(
      'token',
      'U123',
      '7/23(木)17:00~22:00\n' +
        '参加費→男性🚹3,000円\n' +
        '女性🚺1,000円\n' +
        '東京都豊島区西池袋3-31-5 パークハイムウエスト2F\n' +
        'https://maps.example.com/bell',
    );
  });

  it('omits a duplicate template title when the description starts with it', async () => {
    const service = new LineMessagingService();
    const sendPushMessage = jest
      .spyOn(service, 'sendPushMessage')
      .mockResolvedValue(undefined);

    await service.sendReservationConfirm(
      'token',
      'U123',
      '初心者歓迎！',
      new Date('2026-07-23T08:00:00.000Z'),
      '池袋',
      1000,
      '初心者歓迎！\n\n楽しく開催します。',
      '【{title}】ご予約ありがとうございます！\n{description}',
    );

    expect(sendPushMessage).toHaveBeenCalledWith(
      'token',
      'U123',
      'ご予約ありがとうございます！\n初心者歓迎！\n\n楽しく開催します。',
    );
  });

  it('omits the map line when no location URL is configured', async () => {
    const service = new LineMessagingService();
    const sendPushMessage = jest
      .spyOn(service, 'sendPushMessage')
      .mockResolvedValue(undefined);

    await service.sendRemind(
      'token',
      'U123',
      '新歓',
      new Date('2026-07-23T08:00:00.000Z'),
      '池袋',
      '{location}',
    );

    expect(sendPushMessage).toHaveBeenCalledWith('token', 'U123', '池袋');
  });
});
