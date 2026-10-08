import { resolve } from 'path';

/**
 * Keep Multer's write target and Express' static-file root on the same path.
 * Railway must mount a persistent Volume at this directory (default:
 * /app/public/uploads when the compiled app lives in /app/dist).
 */
export function getPublicDir(): string {
  return resolve(
    process.env.PUBLIC_DIR ?? resolve(__dirname, '..', '..', 'public'),
  );
}

export function getUploadDir(): string {
  return resolve(process.env.UPLOAD_DIR ?? resolve(getPublicDir(), 'uploads'));
}
