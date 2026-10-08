import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminOrMobileManageGuard } from '../auth/admin-or-mobile-manage.guard';
import { UploadController } from './upload.controller';

describe('UploadController', () => {
  it('accepts the shared admin-or-mobile-manage authentication guard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, UploadController);
    expect(guards).toContain(AdminOrMobileManageGuard);
  });

  it('returns a public URL for the stored filename', () => {
    const controller = new UploadController();
    expect(
      controller.uploadFile({
        filename: '123-image.webp',
      } as Express.Multer.File),
    ).toEqual({ url: '/uploads/123-image.webp' });
  });
});
