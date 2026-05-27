import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  private async send(to: string, subject: string, html: string): Promise<void> {
    const clientId = this.config.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.config.get<string>('GMAIL_CLIENT_SECRET');
    const refreshToken = this.config.get<string>('GMAIL_REFRESH_TOKEN');
    const gmailUser = this.config.get<string>('GMAIL_USER');

    if (!clientId || !clientSecret || !refreshToken || !gmailUser) {
      this.logger.warn(`[DEV] Email to ${to} | ${subject}`);
      return;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: ${gmailUser}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ];
    const raw = Buffer.from(messageParts.join('\r\n')).toString('base64url');

    try {
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
    } catch (err: any) {
      this.logger.error(`Email send failed: ${err?.message ?? err}`);
      throw new Error('メール送信に失敗しました');
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const url = `${frontendUrl}/auth/verify-email?token=${token}`;
    await this.send(
      to,
      'メールアドレスを確認してください',
      `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#06C755">メールアドレスの確認</h2>
        <p>以下のボタンをクリックして、メールアドレスを確認してください。</p>
        <a href="${url}" style="display:inline-block;background:#06C755;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          メールアドレスを確認する
        </a>
        <p style="color:#888;font-size:13px">このリンクは24時間有効です。心当たりがない場合は無視してください。</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">リンクが機能しない場合はこちらをコピーしてブラウザに貼り付けてください:<br/>${url}</p>
      </div>
      `,
    );
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const url = `${frontendUrl}/reset-password?token=${token}`;
    await this.send(
      to,
      'パスワードリセットのご案内',
      `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#06C755">パスワードリセット</h2>
        <p>パスワードリセットのリクエストを受け付けました。以下のボタンからリセットしてください。</p>
        <a href="${url}" style="display:inline-block;background:#06C755;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          パスワードをリセットする
        </a>
        <p style="color:#888;font-size:13px">このリンクは1時間有効です。心当たりがない場合は無視してください。</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">リンクが機能しない場合はこちらをコピーしてブラウザに貼り付けてください:<br/>${url}</p>
      </div>
      `,
    );
  }
}
