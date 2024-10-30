import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';

// Google Sheets API configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
export async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
export async function saveCredentials(client) {
  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.promises.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
export async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Append scraped products to Google Sheets
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {Array} products Array of product objects to append.
 */
export async function appendToSheet(auth, products) {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '186TESMwGZnGE49mZXA_DIvYWqsy1vbyw1hps-44Txrw'; // Replace with your Google Spreadsheet ID
    const range = 'Sheet1'; // Specifying only the sheet name allows the data to be appended to the next available row
  
    // Prepare values to append
    const values = products.map((product, index) => [
      product.id,  // ID starts at 1
      product.name,
      product.abv,
      product.price,
    ]);
  
    const resource = {
      values,
    };
  
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS', // This ensures new rows are appended
      resource,
    });
  }
  
