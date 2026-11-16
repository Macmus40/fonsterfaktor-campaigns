"use client";

import { useMemo, useState } from "react";
import type {
  ContentVariant,
  MetaChannelCapability,
  Publication,
} from "@/lib/types";
import { PublicationCalendar } from "./PublicationCalendar";
import { PublicationDetail } from "./PublicationDetail";
import { ScheduleForm } from "./ScheduleForm";

type CampaignInfo = {
  id: string;
  name: string;
  slug: string;
  product: string;
  status: string;
};

type Props = {
  campaign: CampaignInfo;
  variants: ContentVariant[];
  initialPublications: Publication[];
  metaChannels: MetaChannelCapability[];
  year: number;
  month: number;
};

export function PublicationsWorkspace({
  campaign,
  variants,
  initialPublications,
  metaChannels,
  year,
  month,
}: Props) {
  const [publications, setPublications] =
    useState<Publication[]>(initialPublications);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPublications[0]?.id ?? null,
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const selected = useMemo(
    () => publications.find((p) => p.id === selectedId) ?? null,
    [publications, selectedId],
  );

  function upsert(pub: Publication) {
    setPublications((prev) => {
      const idx = prev.findIndex((p) => p.id === pub.id);
      if (idx === -1) return [pub, ...prev];
      const next = [...prev];
      next[idx] = pub;
      return next;
    });
    setSelectedId(pub.id);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
          Planowanie i publikacja · Europe/Stockholm
        </p>
        <h1 className="text-2xl font-semibold text-stone-900">
          {campaign.name}
        </h1>
        <p className="text-sm text-stone-600">
          {campaign.product} · status kampanii: {campaign.status} (niezależny od
          statusów publikacji)
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {metaChannels.map((ch) => (
          <div
            key={ch.channel}
            className="rounded-lg border border-stone-200 bg-white/80 px-3 py-3 text-xs"
            data-testid={`meta-status-${ch.channel}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-stone-900">{ch.channel}</span>
              <span className="rounded bg-stone-100 px-2 py-0.5">
                {ch.status}
              </span>
            </div>
            <p className="mt-1 text-stone-600">{ch.notes}</p>
            <p className="mt-1 text-stone-500">
              Day-1 priority: {ch.day1Priority ? "tak" : "nie"}
            </p>
          </div>
        ))}
      </div>

      <PublicationCalendar
        publications={publications}
        year={year}
        month={month}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <ScheduleForm
          campaignId={campaign.id}
          variants={variants}
          defaultDay={selectedDay}
          onCreated={upsert}
        />
        <div className="space-y-3">
          <ul className="flex flex-wrap gap-2">
            {publications.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selectedId === p.id
                      ? "border-teal-700 bg-teal-50 text-teal-900"
                      : "border-stone-300 bg-white text-stone-700"
                  }`}
                >
                  {p.channel} · {p.status}
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <PublicationDetail publication={selected} onChanged={upsert} />
          ) : (
            <p className="text-sm text-stone-500">
              Zaplanuj publikację, aby zobaczyć szczegóły, pakiet ręczny i
              historię prób.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
