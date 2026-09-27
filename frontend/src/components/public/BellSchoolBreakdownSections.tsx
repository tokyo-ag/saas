'use client';

import { useState } from 'react';
import { BellUniversityBreakdown } from './BellUniversityBreakdown';
import { BellVocationalSchoolBreakdown } from './BellVocationalSchoolBreakdown';

// 専門学校セクションの「もっとみる」は、大学セクションを開いてからでないと
// 押せないようにする（順番に見てもらう導線）。ページはサーバーコンポーネント
// なので、両者の開閉状態を橋渡しするためだけのクライアントラッパー。
export function BellSchoolBreakdownSections() {
  const [universityOpened, setUniversityOpened] = useState(false);

  return (
    <>
      <BellUniversityBreakdown onOpen={() => setUniversityOpened(true)} />
      <BellVocationalSchoolBreakdown locked={!universityOpened} />
    </>
  );
}
