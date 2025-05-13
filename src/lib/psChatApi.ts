// src/lib/psChatApi.ts

import axios, { AxiosResponse } from 'axios';
import https from 'https';
import fs from 'fs';

const API_BASE_URL = 'https://pschat.novonordisk.com/api';

// Interface for token object
interface Tokens {
  [key: string]: string;
}

// Function to get authentication tokens
export async function getTokens(): Promise<Tokens> {
  try {
    // Make a POST request to get tokens
    const response: AxiosResponse<Tokens> = await axios.post(
      `${API_BASE_URL}/api/tokens`,
      {
        username: process.env.PS_CHAT_API_USERNAME,
        secret_key: process.env.PS_CHAT_API_SECRET_KEY,
      },
      {
        // Use custom HTTPS agent with the NN-Root certificate
        httpsAgent: new https.Agent({
          ca: fs.readFileSync(process.env.NN_ROOT_PEM_PATH as string),
        }),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw error;
  }
}

// Function to query the chatbot
export async function queryChatbot(query: string, cookies: Tokens): Promise<any> {
  try {
    // Make a POST request to query the chatbot
    const response: AxiosResponse = await axios.post(
      `${API_BASE_URL}/chatbot/static/gpt-4/query`,
      { query },
      {
        headers: {
          // Set the cookie header
          Cookie: Object.entries(cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; '),
        },
        // Use custom HTTPS agent with the NN-Root certificate
        httpsAgent: new https.Agent({
          ca: fs.readFileSync(process.env.NN_ROOT_PEM_PATH as string),
        }),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error querying chatbot:', error);
    throw error;
  }
}