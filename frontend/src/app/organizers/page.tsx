import type { Metadata } from "next";

import ComiuLandingPage from "./OrganizersLanding";

export const metadata: Metadata = {
  title: "イベント・サークルの集客ならCOMIU | 無料で団体ページを作成",
  description:
    "掲載用のホームページなら、もういらない。団体ページ、イベント募集、予約管理、活動ブログ、公式LINE連携をまとめて、Webサイトを育てるWebアプリケーションへ。",
};

export default function OrganizersPage() {
  return <ComiuLandingPage />;
}
