import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import axios from 'axios';

export const publicProductList = [];

// const API_BASE_URL = 'http://localhost:3002'; // Replace with your API's base URL
const API_BASE_URL = 'http://34.141.37.120:3002'; // Replace with your API's base URL

export async function populateLake(product) {
  try {
    console.log(`Pushing for product ${product.name}...`);

    const response = await axios.post(`${API_BASE_URL}/lake`, product);
    console.log(`Response for product ${product.name}:`, response.data);

    // Check API response for status
    if (response.data && response.data.status) {
      if (response.data.status.toLowerCase() === 'updated') {
        return 'updated';
      } else if (response.data.status.toLowerCase() === 'new') {
        return 'new';
      }
    }

    // Default to "new" if no status provided
    return 'new';
  } catch (error) {
    console.error(`Error populating product ${product.name}:`, error.message);
    return 'error';
  }
}
const API_BASE_URL_CLASSIFY = "http://34.141.37.120:8000";

const API_URL = `${API_BASE_URL_CLASSIFY}/process_products`;

export const classifyAll = () => {
  axios
    .post(
      API_URL,
      { number: 'all' }, 
      { headers: { 'Content-Type': 'application/json' } }
    )
    .then((response) => {
      if (response.data.status === 'no_products') {
        console.warn('No products to classify.');
      }
    })
    .catch((error) => {
      console.error('Error triggering classifyAll API:', error);
    });
};
  

export async function saveProductsToCSV(products, filename = 'scraped_products.csv') {
  const csvHeaders = [
    'id',
    'name',
    'abv',
    'producer',
    'product_category',
    'energy',
    'sugar',
    'price',
    'currency',
    'country',
    'url',
    'images',
    'description',
    'gluten_free',
    'vegan',
    'duplicateWith',
    'percentDuplication',
    'site_name',
    'site_url',
    'seller'
  ];

  const outputPath = path.join(process.cwd(), filename);

  let writeHeader = false;

  // Check if file exists
  try {
    await fs.promises.access(outputPath, fs.constants.F_OK);
    writeHeader = false; // file exists, don't write header again
  } catch (error) {
    writeHeader = true; // file does not exist, write header
  }

  // Prepare CSV rows
  const csvRows = products.map(product => {
    return csvHeaders.map(header => {
      const value = product[header] !== undefined ? product[header] : '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  let csvContent = '';

  if (writeHeader) {
    csvContent += csvHeaders.join(',') + '\n'; // Write headers first if file is new
  }

  csvContent += csvRows.join('\n') + '\n'; // Then the data

  // Append to file
  await fs.promises.appendFile(outputPath, csvContent);

  console.log(`✅ Products appended to ${outputPath}`);
}


export async function getClassifiedNeedsInvestigation() {
  const API_URL = 'http://34.141.37.120:3002/lake/classified';
  const payload = {
    classifiedValue: 2,      // needs investigation
    page: 0,
    rowsPerPage: 10000,
    reviewed: null,
    cleaned: 0
  };

  try {
    const response = await axios.post(API_URL, payload);
    const products = response.data?.products || [];
    return products;
  } catch (error) {
    console.error('❌ Error fetching needs investigation products:', error.message);
    return [];
  }
}

