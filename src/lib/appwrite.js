import { Client, Account } from 'appwrite';

export const client = new Client();
client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '69f0a932000f88a5705c'); 

export const account = new Account(client);
