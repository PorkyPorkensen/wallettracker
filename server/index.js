require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;

// Fetch token data from Helius (or Alchemy)
app.get('/api/assets/:wallet', async (req, res) => {
  const { wallet } = req.params;

  try {
    const response = await axios.get(
      `https://api.helius.xyz/v0/addresses/${wallet}/balances?api-key=${process.env.HELIUS_API_KEY}`
    );

    const tokens = response.data.tokens || [];

    // Filter tokens with balance > 0
    const filteredTokens = tokens.filter(token => Number(token.amount) > 0);

    res.json(filteredTokens);
  } catch (err) {
    console.error('Helius asset error:', err.response?.data || err.message || err);
    res.status(500).json({
      error: 'Failed to fetch asset data',
      details: err.response?.data || err.message || err
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));