import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

// Fallback to index.html for root or missing routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Indo-Talent server running at http://${HOST}:${PORT}`);
});
