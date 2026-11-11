/* Sends one request to the Apps Script backend and returns its JSON reply. */
import { BACKEND_URL, REQUEST_TIMEOUT_MS } from './constants.js';

/** Throws on network failure or timeout. The caller decides what message to show. */
export async function sendRequest(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      // text/plain avoids a browser pre-check that Apps Script cannot answer.
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
