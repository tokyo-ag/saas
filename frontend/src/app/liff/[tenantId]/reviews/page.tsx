"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type LiffTenant, type TenantReview } from "@/lib/api";
import { TenantReviewComposer } from "@/components/public/TenantReviewComposer";
import { useLiffTheme } from "@/components/liff/LiffThemeProvider";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function LiffReviewsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const theme = useLiffTheme();
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [reviews, setReviews] = useState<TenantReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.liff.tenant(tenantId),
      api.liff.tenantReviews(tenantId).catch(() => []),
    ])
      .then(([tenantData, reviewData]) => {
        if (cancelled) return;
        setTenant(tenantData);
        setReviews(reviewData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const name = tenant?.lineDisplayName || tenant?.name || "口コミ";
  const icon = tenant?.linePictureUrl || tenant?.iconUrl;

  return (
    <main
      className="min-h-screen px-4 py-5"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="mx-auto max-w-lg">
        <header
          className="mb-4 flex items-center gap-3 rounded-2xl border p-4 shadow-sm"
          style={{
            backgroundColor: theme.navBg,
            borderColor: theme.borderColor,
          }}
        >
          {icon ? (
            <Image
              src={icon}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-500">
              {name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-gray-900">{name}</p>
            <h1 className="mt-0.5 text-xs font-medium text-gray-600">
              口コミ投稿
            </h1>
          </div>
        </header>

        <TenantReviewComposer
          tenantId={tenantId}
          accentColor={theme.accentColor}
          mode="liff"
        />

        <section
          className="rounded-2xl border p-4 shadow-sm"
          style={{
            backgroundColor: theme.navBg,
            borderColor: theme.borderColor,
          }}
        >
          <h2 className="text-sm font-bold text-gray-900">公開中の口コミ</h2>
          {loading ? (
            <p className="mt-3 text-sm text-gray-600">読み込み中…</p>
          ) : reviews.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-gray-600">
              まだ公開中の口コミはありません。
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3"
                >
                  {review.authorIconUrl ? (
                    <Image
                      src={review.authorIconUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500">
                      {review.authorName.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium text-gray-800">
                        {review.authorName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {review.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
