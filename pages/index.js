import { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  // Read the original JSON file
  const filePath = path.join(process.cwd(), 'seal_data.json');
  const jsonData = fs.readFileSync(filePath, 'utf8');
  const originalData = JSON.parse(jsonData);

  // Transform players to optimize size
  const optimizePlayer = (player) => ({
    s: player.slug,                     // slug
    n: player.name,                     // name  
    se: parseInt(player.seal),          // seal
    sc: player.seal_changed,            // seal_changed
    sb: parseInt(player.previous_seal), // previous_seal
    pl: player.price_limited_eur,       // price_limited_eur
    pr: player.price_rare_eur,          // price_rare_eur
    ps: player.price_superrare_eur,          // price_superrare_eur
  });

  const optimizedData = {
    ga: originalData.generated_at,     // generated_at
    summary: originalData.summary,     // Keep summary as-is (small)
    players: {
      '20_seal': originalData.players['20_seal']?.map(optimizePlayer) || [],
      '50_seal': originalData.players['50_seal']?.map(optimizePlayer) || [],
      '200_seal': originalData.players['200_seal']?.map(optimizePlayer) || [],
    }
  };

  return {
    props: {
      sealData: optimizedData,
    },
    revalidate: 3600, 
  };
}

export default function SorarePlayerSealData({ sealData }) {
  const [filters, setFilters] = useState({
    seal: 'all',
    changed: 'all',
    search: '',
    priceType: 'limited' // 'limited' or 'rare' or 'superrare'
  });

  const [filteredPlayers, setFilteredPlayers] = useState([]);

  useEffect(() => {
    populateTable();
  }, [filters, sealData]);

  // get background gradient based on current selection#1487e1
  const getBackgroundGradient = () => {
    if (filters.priceType === 'limited') {
      return 'linear-gradient(135deg, #f7b100 0%, #ff9500 100%)';
    } else if (filters.priceType === 'rare') {
      return 'linear-gradient(135deg, #d94951 0%, #c70000 100%)';
    } else if (filters.priceType === 'superrare') {
      return 'linear-gradient(135deg, #077ad4 0%, #c70000 100%)';
    }
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value.toLowerCase() }));
  };

  // Calculate ratios at runtime 
  const calculateRatio = (price, sealValue) => {
    if (!price || !sealValue) return null;
    return price / parseInt(sealValue);
  };

  const populateTable = () => {
    if (!sealData || !sealData.players) return;

    let allPlayers = [];

    // Get players based on seal filter
    if (filters.seal === 'all') {
      const seal20 = sealData.players['20_seal'] || [];
      const seal50 = sealData.players['50_seal'] || [];
      const seal200 = sealData.players['200_seal'] || [];
      allPlayers = [...seal20, ...seal50, ...seal200];
    } else {
      allPlayers = [...(sealData.players[`${filters.seal}_seal`] || [])];
    }

    // Search filter (using optimized field 'n' for name)
    if (filters.search) {
      allPlayers = allPlayers.filter(p => 
        p.n.toLowerCase().includes(filters.search)
      );
    }

    // Changed filter (using optimized field 'sc')
    if (filters.changed === 'changed') {
      allPlayers = allPlayers.filter(p => p.sc);
    }

    // Sort by ratio - best ratios first
    const priceKey = (filters.priceType === 'limited' ? 'pl' : filters.priceType === 'rare' ? 'pr' : 'ps');
    allPlayers.sort((a, b) => {
      const ratioA = calculateRatio(a[priceKey], a.se); // 'se' for seal
      const ratioB = calculateRatio(b[priceKey], b.se);

      if (ratioA == null && ratioB == null) return 0;
      if (ratioA == null) return 1;
      if (ratioB == null) return -1;

      return ratioA - ratioB; // Always ascending - best ratios first
    });

    setFilteredPlayers(allPlayers);
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) {
      return <span className="no-price">-</span>;
    }
    return price.toFixed(2);
  };

  const formatRatio = (price, sealValue) => {
    const ratio = calculateRatio(price, sealValue);
    if (ratio === null) {
      return <span className="no-price">-</span>;
    }
    return `€${ratio.toFixed(3)}`;
  };

  const getSealBadge = (sealValue) => {
    if (!sealValue && sealValue !== 0) return '';
    return <span className={`seal-badge seal-${sealValue}`}>{sealValue}</span>;
  };

  const getLastUpdateTimes = () => {
    const generatedAt = sealData.ga; 
    
    let priceUpdateTime = generatedAt;
    
    if (priceUpdateTime) {
      const date = new Date(priceUpdateTime);
      date.setHours(date.getHours() + 1);
      priceUpdateTime = date.toISOString();
    }
    
    return {
      priceUpdate: priceUpdateTime ? new Date(priceUpdateTime).toLocaleString() : 'N/A'
    };
  };

  return (
    <>
      <style jsx global>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: ${getBackgroundGradient()};
          min-height: 100vh;
          transition: background 0.3s ease;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .title-section {
          display: flex;
          align-items: center;
        }
        .update-info {
          text-align: left;
          flex: 1;
        }
        .update-line {
          font-size: 0.875rem;
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 4px;
        }
        h1 {
          color: #2d3748;
          margin: 0;
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .summary-info {
          display: flex;
          gap: 30px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-number {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #4a5568;
        }
        .summary-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #718096;
          margin-top: 2px;
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 20px;
          gap: 15px;
        }
        .filter-item {
          flex: 1;
          text-align: center;
        }
        .filter-item label {
          display: block;
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 4px;
          font-size: 0.875rem;
        }
        .filter-item input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 0.875rem;
          width: 250px;
          transition: border-color 0.2s;
        }
        .filter-item input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .filter-group {
          display: inline-flex;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #ccc;
        }
        .filter-group button {
          background: #f0f0f0;
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
          font-size: 0.875rem;
        }
        .filter-group button.active {
          background: #667eea;
          color: white;
        }
        .filter-group button:hover:not(.active) {
          background: #ddd;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 20px 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        th, td {
          padding: 16px 20px;
          text-align: center;
        }
        th {
          background: linear-gradient(135deg, #4a5568, #2d3748);
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.875rem;
          letter-spacing: 0.5px;
        }
        td {
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:nth-child(even) td {
          background: #f8fafc;
        }
        tr:hover td {
          background: #edf2f7;
          transform: scale(1.01);
          transition: all 0.2s ease;
        }
        .price {
          text-align: center;
          font-weight: 600;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .ratio {
          text-align: center;
          font-weight: 700;
          font-family: 'SF Mono', Monaco, monospace;
          color: #2d3748;
        }
        .seal-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.875rem;
          color: white;
          text-align: center;
          min-width: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .seal-1 { background: #ff5a5a; }
        .seal-2 { background: #ff7e34; }
        .seal-5 { background: #f0ce1d; }
        .seal-20 { background: #b6ff1a; }
        .seal-50 { background: #25ed36; }
        .seal-200 { background: #00f3eb; }
        .previous-seal {
          opacity: 0.8;
          margin-left: 8px;
        }
        a {
          color: #4299e1;
          text-decoration: none;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(66, 153, 225, 0.1);
          transition: all 0.2s ease;
        }
        a:hover {
          background: rgba(66, 153, 225, 0.2);
          transform: translateY(-1px);
        }
        .no-price {
          color: #a0aec0;
          font-style: italic;
          font-weight: 500;
        }
      `}</style>
      
      <div className="container">
        <div className="header-section">

          <div className="update-info">
            <div className="update-line">Seal Values Updated Daily</div>
            <div className="update-line">Last Price Update: {getLastUpdateTimes().priceUpdate}</div>
          </div>
          <div className="summary-info">
            <div className="summary-item">
              <span className="summary-number">{sealData.summary?.['20_seal_count'] || 0}</span>
              <span className="summary-label">20 Seal Players</span>
            </div>
            <div className="summary-item">
              <span className="summary-number">{sealData.summary?.['50_seal_count'] || 0}</span>
              <span className="summary-label">50 Seal Players</span>
            </div>
            <div className="summary-item">
              <span className="summary-number">{sealData.summary?.['200_seal_count'] || 0}</span>
              <span className="summary-label">200 Seal Players</span>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="filter-item">
            <label>Search Player</label>
            <input 
              type="text" 
              placeholder="Enter player name..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-item">
            <label>Card Type</label>
            <div className="filter-group">
              <button 
                className={filters.priceType === 'limited' ? 'active' : ''}
                onClick={() => handleFilterChange('priceType', 'limited')}
              >Limited</button>
              <button 
                className={filters.priceType === 'rare' ? 'active' : ''}
                onClick={() => handleFilterChange('priceType', 'rare')}
              >Rare</button>
              <button 
                className={filters.priceType === 'superrare' ? 'active' : ''}
                onClick={() => handleFilterChange('priceType', 'superrare')}
              >Super Rare</button>
            </div>
          </div>

          <div className="filter-item">
            <label>Seal Points</label>
            <div className="filter-group">
              <button 
                className={filters.seal === 'all' ? 'active' : ''}
                onClick={() => handleFilterChange('seal', 'all')}
              >All</button>
              <button 
                className={filters.seal === '20' ? 'active' : ''}
                onClick={() => handleFilterChange('seal', '20')}
              >20</button>
              <button 
                className={filters.seal === '50' ? 'active' : ''}
                onClick={() => handleFilterChange('seal', '50')}
              >50</button>
              <button 
                className={filters.seal === '200' ? 'active' : ''}
                onClick={() => handleFilterChange('seal', '200')}
              >200</button>
            </div>
          </div>

          <div className="filter-item">
            <label>Show</label>
            <div className="filter-group">
              <button 
                className={filters.changed === 'all' ? 'active' : ''}
                onClick={() => handleFilterChange('changed', 'all')}
              >All</button>
              <button 
                className={filters.changed === 'changed' ? 'active' : ''}
                onClick={() => handleFilterChange('changed', 'changed')}
              >Changed</button>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Player Name</th>
              <th>Seal Points</th>
              <th>Previous Seal</th>
              <th>{filters.priceType === 'limited' ? 'Limited' : filters.priceType === 'rare' ? 'Rare' : 'Super Rare'} Price (€)</th>
              <th>€ per Seal Point</th>
              <th>Sorare Link</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, index) => (
              <tr key={index}>
                <td><strong>{player.n || player.name}</strong></td>
                <td>{getSealBadge(player.se || player.seal)}</td>
                                <td>
                  {(player.sc || player.seal_changed) ? (
                    <span className="previous-seal">{getSealBadge(player.sb || player.previous_seal)}</span>
                  ) : null}
                </td>
                <td className="price">
                  {formatPrice(filters.priceType === 'limited' ? player.pl : filters.priceType === 'rare' ? player.pr : player.ps)}
                </td>
                <td className="ratio">
                  {formatRatio(filters.priceType === 'limited' ? player.pl : filters.priceType === 'rare' ? player.pr : player.ps, player.se || player.seal)}
                </td>
                <td>
                  <a href={`https://sorare.com/football/players/${player.s || player.slug}`} target="_blank" rel="noopener noreferrer">
                    View Player
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
