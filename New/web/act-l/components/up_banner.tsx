'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Query, databases } from "../hooks/up_banner";

// Zmieniamy nazwę na Wielką Literę: UpBanner
export function UpBanner() {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    async function pobierzBanery() {
      try {
        const response = await databases.listDocuments(
          '6a297ad10013177be1ab',
          'up_banner',
          [Query.orderAsc('title'), Query.orderDesc('start_date')]
        );
        
        if (response.documents.length > 0) {
          const znalezionyBaner = response.documents[0];
          setBanner(znalezionyBaner);
          sprawdzCzyAktywny(znalezionyBaner);
          console.info("Pobrany baner:", znalezionyBaner);
        }
      } catch (error) {
        console.error("Coś poszło nie tak:", error);
      } finally {
        setLoading(false);
      }
    }

    function sprawdzCzyAktywny(currentBanner) {
      if (!currentBanner.start_date || !currentBanner.end_date) {
        setIsVisible(false);
        return;
      }
      const teraz = new Date();
      const start = new Date(currentBanner.start_date);
      const koniec = new Date(currentBanner.end_date);
      setIsVisible(teraz >= start && teraz <= koniec);
      console.info(`Baner "${currentBanner.title}" jest ${isVisible ? "aktywny" : "nieaktywny"}.`);
    }

    pobierzBanery();

    const interval = setInterval(() => {
      if (banner) sprawdzCzyAktywny(banner);
    }, 10000);

    return () => clearInterval(interval);
  }, [banner]);

  // Haki (useState/useEffect) są WYŻEJ, więc ten warunek poniżej jest już bezpieczny!
  if (loading || !banner || !isVisible) {
    return null; 
  }

  return (
    <div 
      className="flex min-h-10 flex-wrap items-center justify-center px-3 py-2 text-center text-primary-foreground text-sm"
      style={{ backgroundColor: banner.bg_color || '#2563eb' }}
    >
      <span className="font-bold">{banner.title} </span>
      <div>
        <span>{banner.body_text} </span>
        <Link className="mx-1 underline underline-offset-2" href={banner.action_url || "#/pricing"}>
          {banner.action_text || "Sprawdź teraz!"} 
        </Link>
      </div>
    </div>
  );
}