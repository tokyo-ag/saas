// ブログ本文は「先頭に画像1枚（任意）＋本文」をMarkdown内に1つの文字列として
// 保存する形式。管理画面（通常版・超簡単モバイル管理版）の両方で同じ形式を
// 読み書きするため、パース/組み立てロジックをここに集約する。
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const ANY_IMAGE_RE = /!\[[^\]]*]\(([^)]+)\)/;

export function firstBlogImage(body: string | null | undefined) {
  return body?.match(ANY_IMAGE_RE)?.[1] ?? null;
}

// 旧仕様で複数画像が入っていた記事を開いた場合、1枚目だけを画像欄に出し、
// 2枚目以降は本文欄を汚さないようextraImagesとして裏で保持する
// （保存時にそのまま末尾へ書き戻すので、編集し直しても画像が消えることはない）
export function parseBlogBody(body: string): { imageUrl: string | null; extraImages: string[]; text: string } {
  const lines = body.split('\n');
  const images: string[] = [];
  const textLines: string[] = [];
  for (const line of lines) {
    const m = IMAGE_RE.exec(line.trim());
    if (m) {
      images.push(m[2]);
    } else {
      textLines.push(line);
    }
  }
  const text = textLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
  return { imageUrl: images[0] ?? null, extraImages: images.slice(1), text };
}

export function buildBlogBody(imageUrl: string | null, text: string, extraImages: string[] = []): string {
  const parts: string[] = [];
  if (imageUrl) parts.push(`![](${imageUrl})`, '');
  parts.push(text);
  for (const url of extraImages) parts.push('', `![](${url})`);
  return parts.join('\n');
}
