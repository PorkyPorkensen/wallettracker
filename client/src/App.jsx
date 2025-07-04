import React from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios';
import { TokenListProvider } from "@solana/spl-token-registry";
import { Connection, PublicKey } from "@solana/web3.js"; // <-- ✅ SOL integration
import TokenCard from './components/TokenCard';

function App() {
  const [wallet, setWallet] = React.useState('');
  const [tokens, setTokens] = React.useState([]);
  const [tokenList, setTokenList] = React.useState([]);
  const [prices, setPrices] = React.useState({});
  const [totalValue, setTotalValue] = React.useState(0);
  const [unknownRemaining, setUnknownRemaining] = React.useState([]);
  const [showUnknownDetails, setShowUnknownDetails] = React.useState(false);

  React.useEffect(() => {
    new TokenListProvider().resolve().then((container) => {
      const list = container.filterByChainId(101).getList(); // 101 = mainnet
      setTokenList(list);
    });
  }, []);

  const getSolPrice = async () => {
    try {
      const res = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      return res.data.solana.usd || 0;
    } catch (err) {
      console.error("Failed to fetch SOL price:", err);
      return 0;
    }
  };

  const enrichUnknownsWithCoingecko = async (tokens) => {
    const updated = [];
    for (const token of tokens) {
      try {
        const res = await axios.get(`https://api.coingecko.com/api/v3/coins/solana/contract/${token.mint}`);
        const data = res.data;
        updated.push({
          ...token,
          name: data.name,
          symbol: data.symbol.toUpperCase(),
          logoURI: data.image?.small || "",
        });
      } catch (err) {
        updated.push(token);
      }
    }
    return updated;
  };

  const fetchTokens = async () => {
    try {
      const connection = new Connection("https://rpc.helius.xyz/?api-key=258cae47-7300-44bb-be88-1182416282c5");
      const publicKey = new PublicKey(wallet);

      // ✅ Fetch native SOL balance
      const lamports = await connection.getBalance(publicKey);
      const solBalance = lamports / 1e9;
      const solPrice = await getSolPrice();

      // Create pseudo-token for SOL
      const solToken = {
        name: "Solana",
        symbol: "SOL",
        mint: "So11111111111111111111111111111111111111112",
        amount: lamports,
        decimals: 9,
        logoURI: "https://cryptologos.cc/logos/solana-sol-logo.png?v=032"
      };

      const res = await axios.get(`http://localhost:5000/api/assets/${wallet}`);
      const rawTokens = res.data;
      const filtered = rawTokens.filter((asset) => Number(asset.amount) > 0);

      // Enrich with local SPL token registry
      const enriched = filtered.map((token) => {
        const meta = tokenList.find((t) => t.address === token.mint);
        return {
          ...token,
          name: meta?.name || "Unknown",
          symbol: meta?.symbol || "",
          logoURI: meta?.logoURI || "",
        };
      });

      const knownTokens = enriched.filter((t) => t.name !== "Unknown");
      const unknownTokens = enriched.filter((t) => t.name === "Unknown");

      // Pre-add SOL
      knownTokens.unshift(solToken);

      // Build price map (include SOL manually)
      const mintAddresses = enriched.map((t) => t.mint);
      let priceData = {
        [solToken.mint]: { usd: solPrice } // ✅ Include SOL price
      };

      if (mintAddresses.length > 0) {
        const priceURL = `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${mintAddresses.join(',')}&vs_currencies=usd&x_cg_demo_api_key=CG-J7MsjScDMvuF8hC1zDL88zyt`;
        const priceRes = await axios.get(priceURL);
        priceData = { ...priceData, ...priceRes.data };
        setPrices(priceData);
      }

      const sortedUnknowns = [...unknownTokens].sort((a, b) => {
        const pa = priceData[a.mint]?.usd || 0;
        const pb = priceData[b.mint]?.usd || 0;
        const va = pa * (Number(a.amount) / 10 ** a.decimals);
        const vb = pb * (Number(b.amount) / 10 ** b.decimals);
        return vb - va;
      });

      const top12Unknowns = sortedUnknowns.slice(0, 5);
      const enrichedTop12 = await enrichUnknownsWithCoingecko(top12Unknowns);

      let finalKnownTokens = [...knownTokens, ...enrichedTop12];

      finalKnownTokens = finalKnownTokens.sort((a, b) => {
        const priceA = priceData[a.mint]?.usd || 0;
        const priceB = priceData[b.mint]?.usd || 0;
        const amountA = Number(a.amount) / 10 ** a.decimals;
        const amountB = Number(b.amount) / 10 ** b.decimals;
        return (priceB * amountB) - (priceA * amountA);
      });

      const total = [...finalKnownTokens, ...sortedUnknowns.slice(12)].reduce((sum, token) => {
        const price = priceData[token.mint]?.usd || 0;
        const amount = Number(token.amount) / 10 ** token.decimals;
        return sum + (price * amount);
      }, 0);
      setTotalValue(total);

      setTokens(finalKnownTokens);
      setUnknownRemaining(sortedUnknowns.slice(12));
    } catch (err) {
      console.error(err);
    }
  };

  // JSX render (unchanged below here)
  return (
    <div>
      <h1>Solana Wallet Tracker</h1>
            <div className='abt'>
        <h3>About</h3>
        <p>This is my first project using the Solana ecosystem, and my first experience working with any Web3 package. It’s a simple wallet tracker that showcases what I can build using freely available APIs and limited request quotas. Everything you see is stitched together within those boundaries, and I’d love the opportunity to expand and polish the project further with proper API licensing and broader access. I'm excited to keep learning and growing in the blockchain space!</p>
      </div>
      <div className='pv'>
        <p>Example Wallet:</p>
        <p>BMnT51N4iSNhWU5PyFFgWwFvN1jgaiiDr9ZHgnkm3iLJ</p>
      </div>

      <input
        className='walletInp'
        placeholder="Enter wallet address"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
      />
      <button onClick={fetchTokens} className='searchBtn'>Track</button>

      <div className='pv'>
        <h2>Estimated Portfolio Value:</h2>
        <h2 style={{ color: '#00FFA3' }}>${totalValue.toFixed(2)}</h2>
      </div>

      <div className='coinContainer'>
        {tokens.map((token, i) => (
          <TokenCard key={i} token={token} price={prices[token.mint]?.usd ?? null} />
        ))}
      </div>

      {unknownRemaining.length > 0 && (
        <div className='otherTkns'>
          <h3 style={{ cursor: 'pointer' }} onClick={() => setShowUnknownDetails(prev => !prev)}>
            Other Tokens {showUnknownDetails ? '▲' : '▼'}
          </h3>
          <p>
            Grouped Value: <strong style={{ color: '#00FFA3' }}>${unknownRemaining.reduce((sum, t) => {
              const price = prices[t.mint]?.usd || 0;
              const amount = Number(t.amount) / 10 ** t.decimals;
              return sum + (price * amount);
            }, 0).toFixed(2)} USD</strong>
          </p>
          {showUnknownDetails && (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {unknownRemaining.map((t, i) => {
                const price = prices[t.mint]?.usd || 0;
                const amount = Number(t.amount) / 10 ** t.decimals;
                const value = (price * amount).toFixed(2);
                return (
                  <li key={i} style={{
                    borderBottom: '1px solid #ccc',
                    padding: '0.5rem 0',
                    fontSize: '0.9rem',
                    margin: '1rem 0'
                  }}>
                    <strong><a href={`https://birdeye.so/token/${t.mint}?chain=solana`}>{t.name || 'Unknown'}</a></strong> — {amount.toFixed(6)} tokens — ${value} USD
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.5em' }}>
                      Mint: {t.mint}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;