"use client";

import { MessageCircle } from "lucide-react";
import ConversationListPane from "@/components/communaute/ConversationListPane";

export default function CommunautePage() {
  return (
    <div className="md:flex md:h-[100dvh] md:overflow-hidden">
      <ConversationListPane className="md:w-[440px] md:shrink-0 md:border-r md:border-[rgba(var(--text-3-rgb),.14)]" />

      <div className="hidden min-w-0 flex-1 items-center justify-center px-10 md:flex">
        <div className="max-w-[340px] text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px]"
            style={{
              background: "rgba(var(--tint-violet-rgb), .55)",
              color: "var(--accent)",
              boxShadow: "0 16px 40px rgba(var(--accent-rgb), .10)",
            }}
          >
            <MessageCircle className="h-7 w-7" strokeWidth={1.6} />
          </div>
          <h2 className="mt-5 text-[20px] font-semibold" style={{ color: "var(--text-1)" }}>
            Tes discussions, ici
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            Choisis une conversation à gauche. Elle restera ouverte à côté de ta liste.
          </p>
        </div>
      </div>
    </div>
  );
}
