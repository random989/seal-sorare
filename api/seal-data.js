export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/random989/seal-sorare/main/seal_data.json',
      { 
        headers: { 'Cache-Control': 'no-cache' }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.json(data);
  } catch (error) {
    console.error('Error fetching seal data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}