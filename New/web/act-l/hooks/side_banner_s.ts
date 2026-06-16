// 1. Dodajemy import "Models" z appwrite
import { Client, Databases, Query, Models } from 'appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('680d15210002f3f65ea9');

const databases = new Databases(client);

// 2. Modyfikujemy interfejs: dodajemy "extends Models.Document"
// Dzięki temu TypeScript automatycznie dorzuci tu $id, $collectionId, $createdAt itd.
interface BannerData extends Models.Document {
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

export async function fetchLatestBanner(): Promise<BannerResult> {
    try {
        console.log('--- APPWRITE: Rozpoczynam pobieranie baneru ---');
        
        // 3. Teraz czysto przekazujemy uproszczony generyk <BannerData>
        const response = await databases.listDocuments<BannerData>(
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
            const now = new Date();
            const startDate = new Date(doc.start_date);
            const hasEndDate = doc.end_date ? true : false;
            const endDate = doc.end_date ? new Date(doc.end_date) : null;

            const isInsideTimeWindow = now >= startDate && (!hasEndDate || (endDate ? now <= endDate : true));

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