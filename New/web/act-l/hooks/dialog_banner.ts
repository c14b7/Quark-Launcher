import { Client, Databases, Query } from "appwrite";

// 1. Inicjalizacja klienta
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('680d15210002f3f65ea9');

// 2. Poprawna klasa do obsługi baz danych
const databases = new Databases(client);

// Funkcja pomocnicza do pobierania banerów (opcjonalne, ale ułatwia życie)
const getBanners = () => {
    return databases.listDocuments(
        '6a297ad10013177be1ab', // databaseId
        'dialog_banner',            // collectionId (w Appwrite są kolekcje, nie tabele)
        [
            Query.orderAsc('title'),
            Query.orderDesc('start_date'),
            // Zostawiłem dwa główne sortowania. Jeśli potrzebujesz reszty, 
            // upewnij się, że masz skonfigurowane odpowiednie indeksy w konsoli Appwrite!
        ]
    );
};

export { databases, Query, getBanners };