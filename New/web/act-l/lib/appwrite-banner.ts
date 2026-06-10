// lib/appwrite.ts

import { Client, Account, TablesDB } from "appwrite";

const client = new Client();

client
    .setEndpoint('')
    .setProject('');

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export { ID } from "appwrite";
