export function formatSupportMessageContent(content: string): string {
  if (!content.startsWith('【コラボ申請')) return content;

  const lines = content
    .split('\n')
    .filter(
      (line) =>
        !line.startsWith('参加予定団体:') &&
        !line.startsWith('申請元団体ID:') &&
        !line.startsWith('イベントID:'),
    );
  if (lines[0] !== '【コラボ申請】') return lines.join('\n');

  lines[0] = '【コラボ申請（承認待ち）】';
  const sourceLineIndex = lines.findIndex((line) =>
    line.endsWith('からコラボ申請が届きました。'),
  );
  if (sourceLineIndex >= 0) {
    lines[sourceLineIndex] = `申請元団体: ${lines[sourceLineIndex].replace('からコラボ申請が届きました。', '')}`;
  }
  let replyLineIndex = lines.findIndex((line) =>
    line.startsWith('参加可否や確認事項は、'),
  );
  if (!lines.some((line) => line.includes('合同開催は確定していません'))) {
    lines.splice(
      replyLineIndex >= 0 ? replyLineIndex : lines.length,
      0,
      'この時点では合同開催は確定していません。',
    );
  }
  replyLineIndex = lines.findIndex((line) =>
    line.startsWith('参加可否や確認事項は、'),
  );
  if (replyLineIndex >= 0) {
    lines[replyLineIndex] =
      '承認・辞退や確認事項は、このチャットへ返信してください。';
  }
  return lines.join('\n');
}

export function isPendingCollabRequest(content: string): boolean {
  return (
    content.startsWith('【コラボ申請】') ||
    content.startsWith('【コラボ申請（承認待ち）】')
  );
}
