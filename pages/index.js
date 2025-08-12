import { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  // Read the JSON file at build time
  const filePath = path.join(process.cwd(), 'seal_data.json');
  const jsonData = fs.readFileSync(filePath, 'utf8');
  const sealData = JSON.parse(jsonData);

  return {
    props: {
      sealData,
    },
    revalidate: 3600, 
  };
}

export default function SorarePlayerSealData({ sealData }) {
  const [filters, setFilters] = useState({
    seal: '200',
    changed: 'all',
    orderBy: 'limited',
    direction: 'asc',
    search: ''
  });

  const [filteredPlayers, setFilteredPlayers] = useState([]);

  useEffect(() => {
    populateTable();
  }, [filters, sealData]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value.toLowerCase() }));
  };

  const populateTable = () => {
    if (!sealData || !sealData.players) return;

    let allPlayers = [...(sealData.players[`${filters.seal}_seal`] || [])];

    // Search filter
    if (filters.search) {
      allPlayers = allPlayers.filter(p => 
        p.name.toLowerCase().includes(filters.search)
      );
    }

    // Changed filter
    if (filters.changed === 'changed') {
      allPlayers = allPlayers.filter(p => p.seal_changed);
    }

    // Sort
    const priceKey = filters.orderBy === 'limited' ? 'price_limited_eur' : 'price_rare_eur';
    allPlayers.sort((a, b) => {
      const va = a[priceKey];
      const vb = b[priceKey];

      // Priceless always last
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      // Normal sort for non-null values
      return filters.direction === 'asc' ? va - vb : vb - va;
    });

    setFilteredPlayers(allPlayers);
  };

  const formatPrice = (price) => {
    if (price === null) {
      return <span className="no-price">-</span>;
    }
    return price.toFixed(2);
  };

  const getSealBadge = (sealValue) => {
    if (!sealValue && sealValue !== 0) return '';
    return <span className={`seal-badge seal-${sealValue}`}>{sealValue}</span>;
  };
  /*
  const getChangedCount = () => {
    if (!sealData.players) return 0;
    const all50 = sealData.players['50_seal'] || [];
    const all200 = sealData.players['200_seal'] || [];
    return [...all50, ...all200].filter(p => p.seal_changed).length;
  };*/

  return (
    <>
      <style jsx global>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
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
          gap: 10px;
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
          <h1>Sorare Player Seal Data</h1>
          <div className="summary-info">
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
          {/* Search */}
          <div className="filter-item">
            <label>Search Player</label>
            <input 
              type="text" 
              placeholder="Enter player name..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>

          {/* Seal Points Filter */}
          <div className="filter-item">
            <label>Seal Points</label>
            <div className="filter-group">
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

          {/* Changed Only Filter */}
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

          {/* Order By */}
          <div className="filter-item">
            <label>Order By</label>
            <div className="filter-group">
              <button 
                className={filters.orderBy === 'limited' ? 'active' : ''}
                onClick={() => handleFilterChange('orderBy', 'limited')}
              >Limited</button>
              <button 
                className={filters.orderBy === 'rare' ? 'active' : ''}
                onClick={() => handleFilterChange('orderBy', 'rare')}
              >Rare</button>
            </div>
          </div>

          {/* Sort Direction */}
          <div className="filter-item">
            <label>Sort</label>
            <div className="filter-group">
              <button 
                className={filters.direction === 'asc' ? 'active' : ''}
                onClick={() => handleFilterChange('direction', 'asc')}
              >Low to High</button>
              <button 
                className={filters.direction === 'desc' ? 'active' : ''}
                onClick={() => handleFilterChange('direction', 'desc')}
              >High to Low</button>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Player Name</th>
              <th>Seal Points</th>
              <th>Previous Seal</th>
              <th>Limited Price (€)</th>
              <th>Rare Price (€)</th>
              <th>Sorare Link</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, index) => (
              <tr key={index}>
                <td><strong>{player.name}</strong></td>
                <td>{getSealBadge(player.seal)}</td>
                <td>
                  {player.seal != player.previous_seal ? (
                    <span className="previous-seal">{getSealBadge(player.previous_seal)}</span>
                  ) : null}
                </td>
                <td className="price">{formatPrice(player.price_limited_eur)}</td>
                <td className="price">{formatPrice(player.price_rare_eur)}</td>
                <td>
                  <a href={`https://sorare.com/football/players/${player.slug}`} target="_blank" rel="noopener noreferrer">
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
