import type { Metadata } from "next";

import ComiuLandingPage, { type TrialBanner } from "./OrganizersLanding";
import { API_URL } from "@/lib/config";

export const revalidate = 60;

const DEFAULT_TITLE = "イベント・サークルの集客ならCOMIU | 無料で団体ページを作成";
const DEFAULT_DESCRIPTION =
  "掲載用のホームページなら、もういらない。団体ページ、イベント募集、予約管理、活動ブログ、公式LINE連携をまとめて、Webサイトを育てるWebアプリケーションへ。";

type OfficialSite = {
  status: "draft" | "published";
  heroTitle: string;
  heroLead: string;
  primaryCtaHref: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

async function fetchOfficialSite(): Promise<OfficialSite | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-site`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await fetchOfficialSite();
  return {
    title: site?.seoTitle || DEFAULT_TITLE,
    description: site?.seoDescription || DEFAULT_DESCRIPTION,
  };
}

export default async function OrganizersPage() {
  const site = await fetchOfficialSite();
  // トライアル告知バナーはstatus=publishedかつ見出しが入力されている時だけ表示する。
  // H1・ヒーロー本体はこのデータに依存しないので、未設定/取得失敗でも表示は崩れない。
  const banner: TrialBanner | null =
    site?.status === "published" && site.heroTitle
      ? { heroTitle: site.heroTitle, heroLead: site.heroLead, primaryCtaHref: site.primaryCtaHref }
      : null;

  return <ComiuLandingPage banner={banner} />;
}
