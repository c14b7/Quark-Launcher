'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
// Importujesz Query i databases ze swojego pliku (popraw ścieżkę jeśli jest inna!)
import { Query, databases } from "../hooks/dialog_banner"; 
import ReactMarkdown from "react-markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DialogBanner() {
  const [banner, setBanner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // 1. NOWY STAN: Czy użytkownik zamknął już ten baner ręcznie?
  const [userClosed, setUserClosed] = useState(false);

  function sprawdzCzyAktywny(currentBanner: any) {
    // Jeśli użytkownik już go zamknął, nie pozwól na ponowne automatyczne otwarcie
    if (userClosed) return;

    if (!currentBanner || !currentBanner.start_date || !currentBanner.end_date) {
      setIsDialogOpen(false);
      return;
    }
    const teraz = new Date();
    const start = new Date(currentBanner.start_date);
    const koniec = new Date(currentBanner.end_date);
    
    const aktywny = teraz >= start && teraz <= koniec;
    setIsDialogOpen(aktywny); 
  }

  // 2. Musimy czyścić flagę userClosed tylko wtedy, gdy ID baneru w bazie naprawdę się zmieni na inny
  useEffect(() => {
    async function pobierzBanery() {
      try {
        const response = await databases.listDocuments(
          '6a297ad10013177be1ab',
          'dialog_banner',
          [Query.orderAsc('title'), Query.orderDesc('start_date')]
        );
        
        if (response.documents.length > 0) {
          const znalezionyBaner = response.documents[0];
          
          // Jeśli z bazy przyszedł INNY baner niż mieliśmy, resetujemy blokadę zamknięcia
          if (banner && banner.$id !== znalezionyBaner.$id) {
            setUserClosed(false);
          }

          setBanner(znalezionyBaner);
          // Wywołujemy sprawdzanie tylko pod warunkiem, że użytkownik go wcześniej nie wyłączył
          if (!userClosed) {
            sprawdzCzyAktywny(znalezionyBaner);
          }
        }
      } catch (error) {
        console.error("Błąd podczas pobierania banerów z Appwrite:", error);
      } finally {
        setLoading(false);
      }
    }

    pobierzBanery();
  }, [banner, userClosed]); // Dodajemy userClosed do zależności

  if (loading || !banner) {
    return null; 
  }

  // 3. Łapiemy moment zamknięcia przez onOpenChange oraz przyciski
  const handleClose = () => {
    setUserClosed(true);
    setIsDialogOpen(false);
  };

  return (
    // Używamy handleClose przy zmianie stanu otwarcia (np. kliknięcie poza modalem / ESC)
    <AlertDialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{banner.title}</AlertDialogTitle>
          
          {/* DODAJEMY: asChild, dzięki czemu AlertDialogDescription stanie się divem, a nie drugą eSką */}
          <AlertDialogDescription className="text-[15px]" asChild>
            <div className="text-muted-foreground dark:text-slate-300 [.oled_&]:text-slate-300">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => (
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white [.oled_&]:text-white mt-2 mb-1" {...props} />
                  ),
                  h2: ({ ...props }) => (
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white [.oled_&]:text-white mt-2 mb-1" {...props} />
                  ),
                  p: ({ ...props }) => (
                    // Klasy koloru przenieśliśmy wyżej do diva, tu zostawiamy sam layout
                    <p className="leading-relaxed" {...props} />
                  ),
                  strong: ({ ...props }) => (
                    <strong className="font-semibold text-slate-900 dark:text-white [.oled_&]:text-white" {...props} />
                  ),
                }}
              >
                {banner.body_text}
              </ReactMarkdown>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Ręcznie dopisujemy akcję zamknięcia pod onClick */}
          <AlertDialogCancel onClick={handleClose}>Zamknij</AlertDialogCancel>
          <AlertDialogAction asChild onClick={handleClose}>
            <Link href={banner.action_url || "#"}>
              {banner.action_text || "Sprawdź"}
            </Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}