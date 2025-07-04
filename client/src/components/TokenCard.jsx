import solPic from "../images/sol.png"

export default function TokenCard({ token, price }) {
  const { name, symbol, logoURI, amount, decimals, mint } = token;
  const formattedAmount = (Number(amount) / 10 ** decimals).toFixed(4);
  const valueUSD = price ? (price * formattedAmount).toFixed(2) : null;
    console.log(token)
  return (
    <div className='coinDiv'>
        {logoURI
        ? <img   src={token.symbol === 'SOL' ? solPic : logoURI} alt={name} className="coinLogo" />
        : <i className="fa-brands fa-bitcoin" style={{ fontSize: 60, marginBottom: '1rem' }}></i>
        }
      <h3><a href={`https://birdeye.so/token/${mint}?chain=solana`}>{name} {symbol ? `(${symbol})` : ''}</a></h3>
      <p><strong>{formattedAmount}</strong></p>
      {price && <p>≈ ${valueUSD} USD</p>}
        {/* <strong>{tokenAccount}</strong> */}
    </div>
  );
}