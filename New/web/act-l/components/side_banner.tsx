"use client"; // Pamiętaj o tym, jeśli to Next.js App Router, bo używamy stanów

import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemTitle,
} from "@/hooks/side_banner";

// 1. Importujemy komponent do renderowania Markdownu
import ReactMarkdown from "react-markdown";

// 2. Importujemy funkcję oraz interfejs z nowego hooka
import { fetchLatestBanner, BannerResult } from "@/hooks/side_banner_s";

export function CardPost() {
  // Tworzymy stan na dane z Appwrite (początkowo null)
  const [banner, setBanner] = useState<BannerResult | null>(null);

  // Pobieramy dane przy zamontowaniu komponentu
  useEffect(() => {
    async function loadData() {
      const data = await fetchLatestBanner();
      setBanner(data);
    }
    loadData();
  }, []);

  // Jeśli dane się jeszcze ładują, zwracamy np. szkielet (skeleton) lub nic
  if (!banner) {
    return <div className="w-full max-w-xs p-4 text-center text-sm text-muted-foreground">Ładowanie...</div>;
  }

  // KLUCZOWY WARUNEK: Jeśli czas minął lub dane są nieaktywne, ukrywamy cały komponent
  if (!banner.display) {
    return null;
  }

  return (
    <Card className="w-full max-w-xs gap-0 py-0 shadow-none">
      <CardHeader className="-mr-1 flex flex-row items-center justify-between py-2.5">
        <Item className="w-full gap-2.5 p-0">
          <ItemContent className="gap-0">
            {/* Używamy danych ze stanu 'banner' */}
            <ItemTitle>{banner.title}</ItemTitle>
          </ItemContent>
        </Item>
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-4 py-4">
          <div className="mt-1 text-muted-foreground text-sm flex flex-col gap-2">
            <ReactMarkdown
              components={{
                h1: ({ ...props }) => (
                  // Zmienione: dodane uniwersalne klasy dla ciemnych trybów i fallback
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white [.oled_&]:text-white mt-2 mb-1" {...props} />
                ),
                h2: ({ ...props }) => (
                  // Zmienione: dokładnie to samo dla h2
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white [.oled_&]:text-white mt-2 mb-1" {...props} />
                ),
                p: ({ ...props }) => (
                  // Dla paragrafów upewniamy się, że w trybie dark/oled tekst też rozbłyśnie, a nie zszarzeje za mocno
                  <p className="leading-relaxed text-muted-foreground dark:text-slate-300 [.oled_&]:text-slate-300" {...props} />
                ),
                strong: ({ ...props }) => (
                  <strong className="font-semibold text-slate-900 dark:text-white [.oled_&]:text-white" {...props} />
                ),
              }}
            >
              {banner.body_text}
            </ReactMarkdown>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t px-2 py-2 pb-0">
        {/* Dodany tag <a> sprawia, że przycisk faktycznie przekierowuje do action_url */}
        <Button variant="default" asChild className="w-full">
          <a href={banner.action_url} target="_blank" rel="noopener noreferrer">
            {banner.action_text}
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}