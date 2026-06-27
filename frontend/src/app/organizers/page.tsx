import type { Metadata } from "next";

import ComiuLandingPage from "./OrganizersLanding";

export const metadata: Metadata = {
  title: "COMIU | イベント・サークルの集客ならCOMIU",
  description:
    "団体に合わせたWebサイトを無料で作成。SEOに強い公開ページ、ポータル掲載、予約管理、公式LINE API連携までCOMIUでまとめられます。",
};

export default function OrganizersPage() {
  return <ComiuLandingPage />;
}
