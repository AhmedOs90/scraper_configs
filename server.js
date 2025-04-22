import express from 'express';
import cors from 'cors'; // Import cors
import scraperRoutes from './routes/scrapper.js';

const app = express();

app.use(cors()); // Enable CORS for all origins
app.use(express.json());
app.use('/api/scraper', scraperRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

