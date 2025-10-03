import { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  // Read the original JSON file
  const filePath = path.join(process.cwd(), 'seal_data.json');
  const jsonData = fs.readFileSync(filePath, 'utf8');
  const originalData = JSON.parse(jsonData);

  // Helper function to calculate ratio
  const calculateRatio = (price, sealValue) => {
    if (!price || !sealValue) return null;
    return parseFloat((price / parseInt(sealValue)).toFixed(3));
  };

  // Transform players to optimize size and pre-calculate ratios
  const optimizePlayer = (player) => {
    const sealValue = parseInt(player.seal);
    const limitedPrice = player.price_limited_eur;
    const rarePrice = player.price_rare_eur;
    const superrarePrice = player.price_superrare_eur;

    return {
      s: player.slug,                     // slug
      n: player.name,                     // name  
      se: sealValue,                      // seal
      sc: player.seal_changed ? 1 : 0,    // seal_changed
      sb: parseInt(player.previous_seal), // previous_seal
      pl: limitedPrice,                   // price_limited_eur
      pr: rarePrice,                      // price_rare_eur
      ps: superrarePrice,                 // price_superrare_eur
      // Pre-calculated ratios
      rl: calculateRatio(limitedPrice, sealValue),    // ratio_limited
      rr: calculateRatio(rarePrice, sealValue),       // ratio_rare
      rs: calculateRatio(superrarePrice, sealValue),  // ratio_superrare
    };
  };

  const optimizedData = {
    ga: originalData.generated_at,     // generated_at
    summary: originalData.summary,     
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
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(50);
  const [clientTime, setClientTime] = useState(null);

  useEffect(() => {
    populateTable();
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, sealData]);

  // get background gradient based on current selection
  const getBackgroundGradient = () => {
    if (filters.priceType === 'limited') {
      return 'linear-gradient(135deg, #f7b100 0%, #ff9500 100%)';
    } else if (filters.priceType === 'rare') {
      return 'linear-gradient(135deg, #d94951 0%, #c70000 100%)';
    } else if (filters.priceType === 'superrare') {
      return 'linear-gradient(135deg, #077ad4 0%, #077ad4 100%)';
    }
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      return newFilters;
    });
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value.toLowerCase() }));
  };

  const handlePlayersPerPageChange = (e) => {
    setPlayersPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  // Get pre-calculated ratio based on price type
  const getRatioField = (priceType) => {
    switch(priceType) {
      case 'limited': return 'rl';
      case 'rare': return 'rr';
      case 'superrare': return 'rs';
      default: return 'rl';
    }
  };

  const getPriceField = (priceType) => {
    switch(priceType) {
      case 'limited': return 'pl';
      case 'rare': return 'pr';
      case 'superrare': return 'ps';
      default: return 'pl';
    }
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

    // Sort by pre-calculated ratio - best ratios first
    const ratioField = getRatioField(filters.priceType);
    allPlayers.sort((a, b) => {
      const ratioA = a[ratioField];
      const ratioB = b[ratioField];

      if (ratioA == null && ratioB == null) return 0;
      if (ratioA == null) return 1;
      if (ratioB == null) return -1;

      return ratioA - ratioB; // Always ascending - best ratios first
    });

    setFilteredPlayers(allPlayers);
  };

  // Pagination calculations
  const totalPlayers = filteredPlayers.length;
  const totalPages = Math.ceil(totalPlayers / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const currentPlayers = filteredPlayers.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPaginationNumbers = () => {
    const delta = 1; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) {
      return <span className="no-price">-</span>;
    }
    return price.toFixed(2);
  };

  const formatRatio = (ratio) => {
    if (ratio === null || ratio === undefined) {
      return <span className="no-price">-</span>;
    }
    return `€${ratio.toFixed(3)}`;
  };

  const getSealBadge = (sealValue) => {
    if (!sealValue && sealValue !== 0) return '';
    return <span className={`seal-badge seal-${sealValue}`}>{sealValue}</span>;
  };

  useEffect(() => {
    if (sealData.ga) {
      const date = new Date(sealData.ga);
      setClientTime(date.toLocaleString());
    }
  }, [sealData.ga]);

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
          color: #e2e8f0;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          border: 1px solid rgba(71, 85, 105, 0.3);
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
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        h1 {
          color: #f1f5f9;
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
          color: #f1f5f9;
        }
        .summary-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #94a3b8;
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
          color: #cbd5e1;
          margin-bottom: 4px;
          font-size: 0.875rem;
        }
        .filter-item input, .filter-item select {
          padding: 8px 12px;
          border: 1px solid #475569;
          border-radius: 6px;
          font-size: 0.875rem;
          width: 250px;
          transition: border-color 0.2s;
          background: #334155;
          color: #f1f5f9;
        }
        .filter-item input:focus, .filter-item select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }
        .filter-item input::placeholder {
          color: #94a3b8;
        }
        .filter-group {
          display: inline-flex;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #475569;
        }
        .filter-group button {
          background: #475569;
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
          font-size: 0.875rem;
          color: #e2e8f0;
        }
        .filter-group button.active {
          background: #667eea;
          color: white;
        }
        .filter-group button:hover:not(.active) {
          background: #64748b;
        }
        .pagination-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 10px;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }
        .results-info {
          font-weight: 600;
          color: #cbd5e1;
        }
        .rows-per-page {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rows-per-page label {
          font-weight: 600;
          color: #cbd5e1;
          font-size: 0.875rem;
        }
        .rows-per-page select {
          padding: 6px 10px;
          border: 1px solid #475569;
          border-radius: 6px;
          font-size: 0.875rem;
          width: auto;
          min-width: 70px;
          background: #334155;
          color: #f1f5f9;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 20px 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }
        th, td {
          padding: 16px 20px;
          text-align: center;
        }
        th {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          color: #f1f5f9;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.875rem;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #334155;
        }
        td {
          background: #1e293b;
          border-bottom: 1px solid #334155;
          color: #e2e8f0;
        }
        tr:nth-child(even) td {
          background: #334155;
        }
        tr:hover td {
          background: #475569;
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
          color: #f1f5f9;
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
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
        .seal-1 { background: #cc4848; }
        .seal-2 { background: #cc652a; }
        .seal-5 { background: #c0a517; }
        .seal-20 { background: #92cc15; }
        .seal-50 { background: #1ebe2b; }
        .seal-200 { background: #00c2bc; }
        .previous-seal {
          opacity: 0.8;
          margin-left: 8px;
        }
        a {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(96, 165, 250, 0.1);
          transition: all 0.2s ease;
        }
        a:hover {
          background: rgba(96, 165, 250, 0.2);
          transform: translateY(-1px);
        }
        .no-price {
          color: #64748b;
          font-style: italic;
          font-weight: 500;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin-top: 30px;
          padding: 20px;
          background: rgba(30, 41, 59, 0.7);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(71, 85, 105, 0.3);
        }
        .pagination button {
          padding: 10px 15px;
          border: 1px solid #475569;
          background: #334155;
          color: #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
          min-width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pagination button:hover:not(:disabled) {
          background: #475569;
          border-color: #64748b;
          transform: translateY(-1px);
        }
        .pagination button.active {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .pagination .dots {
          padding: 10px 5px;
          color: #94a3b8;
          font-weight: 600;
        }
      `}</style>
      
      <div className="container">
        <div className="header-section">
          <div className="update-info">
            <div className="update-line">Seal Values Updated Daily</div>
            <div className="update-line">Last Price Update: {clientTime || 'Loading...'}</div>
          </div>
          <div className="update-info">
            <div className="update-line">&#9888; Always check the seal value before buying!</div>
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
            {currentPlayers.map((player, index) => {
              const priceField = getPriceField(filters.priceType);
              const ratioField = getRatioField(filters.priceType);
              
              return (
                <tr key={startIndex + index}>
                  <td><strong>{player.n || player.name}</strong></td>
                  <td>{getSealBadge(player.se || player.seal)}</td>
                  <td>
                    {(player.sc || player.seal_changed) ? (
                      <span className="previous-seal">{getSealBadge(player.sb || player.previous_seal)}</span>
                    ) : null}
                  </td>
                  <td className="price">
                    {formatPrice(player[priceField])}
                  </td>
                  <td className="ratio">
                    {formatRatio(player[ratioField])}
                  </td>
                  <td>
                    <a href={`https://sorare.com/football/players/${player.s || player.slug}`} target="_blank" rel="noopener noreferrer">
                      View Player
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => goToPage(currentPage - 1)} 
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            
            {getPaginationNumbers().map((number, index) => (
              number === '...' ? (
                <span key={index} className="dots">...</span>
              ) : (
                <button
                  key={index}
                  onClick={() => goToPage(number)}
                  className={currentPage === number ? 'active' : ''}
                >
                  {number}
                </button>
              )
            ))}
            
            <button 
              onClick={() => goToPage(currentPage + 1)} 
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
