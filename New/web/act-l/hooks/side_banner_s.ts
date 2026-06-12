import { Client, Databases, Query } from 'appwrite';

// 1. Konfiguracja klienta Appwrite
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('680d15210002f3f65ea9');

const databases = new Databases(client);

// Definiujemy pełny typ danych z Appwrite
interface BannerData {
    title: string;
    body_text: string;
    action_text: string | null;
    action_url: string | null;
    start_date: string; 
    end_date: string;
}

export interface BannerResult {
    title: string;
    body_text: string;
    action_text: string;
    action_url: string;
    display: boolean;
}

const FALLBACK_DATA: BannerResult = {
    title: 'Brak aktywnego baneru',
    body_text: '',
    action_text: '',
    action_url: '#',
    display: false
};

// 2. Funkcja pobierająca baner i sprawdzająca daty
export async function fetchLatestBanner(): Promise<BannerResult> {
    try {
        console.log('--- APPWRITE: Rozpoczynam pobieranie baneru ---');
        
        const response = await databases.listDocuments<BannerData & { $createdAt: string }>(
            '6a297ad10013177be1ab', 
            'side_banner',          
            [
                Query.orderDesc('$createdAt'), 
                Query.limit(1)                
            ]
        );

        console.log(`--- APPWRITE: Znaleziono dokumentów: ${response.documents.length} ---`);

        if (response.documents.length > 0) {
            const doc = response.documents[0];

            // 1. Pobieramy aktualny czas
            const now = new Date();

            // 2. Parsujemy datę startu
            const startDate = new Date(doc.start_date);

            // 3. Sprawdzamy, czy end_date w ogóle istnieje w dokumencie
            const hasEndDate = doc.end_date ? true : false;
            const endDate = doc.end_date ? new Date(doc.end_date) : null;

            // 4. Nowy, bezpieczny warunek logiczny:
            // Baner jest aktywny, jeśli:
            // - czas teraz jest większy/równy startowi
            // - ORAZ (baner nie ma daty końca ALBO czas teraz jest mniejszy/równy dacie końca)
            const isInsideTimeWindow = now >= startDate && (!hasEndDate || (endDate ? now <= endDate : true));

            // --- ZAKTUALIZOWANY DEBUGER ---
            console.group('📊 DEBUG BANERU Appwrite');
            console.log('📌 Tytuł baneru:', doc.title);
            console.log('🕒 Czas teraz (lokalny): ', now.toString());
            console.log('🛫 Start baneru:', startDate.toString());
            console.log('🛬 Koniec baneru:', hasEndDate ? endDate?.toString() : 'Brak limitu (Zawsze wyświetlaj)');
            console.log('🤔 Czy teraz >= Start?', now >= startDate);
            console.log('🤔 Czy teraz <= Koniec?', hasEndDate ? (endDate ? now <= endDate : false) : 'N/A (Brak końca)');
            console.log('🚨 WYNIK (display):', isInsideTimeWindow ? '🟢 TRUE (Pokaż)' : '🔴 FALSE (Ukryj)');
            console.groupEnd();

            return {
                title: doc.title,
                body_text: doc.body_text,
                action_text: doc.action_text || 'Kliknij tutaj', 
                action_url: doc.action_url || '#',
                display: isInsideTimeWindow 
            };
        }

        console.warn('⚠️ APPWRITE: Kolekcja jest pusta. Zwracam FALLBACK.');
        return FALLBACK_DATA;
    } catch (error) {
        console.error('❌ APPWRITE BŁĄD:', error);
        return FALLBACK_DATA;
    }
}