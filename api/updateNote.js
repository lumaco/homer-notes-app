import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { id, text, image_url } = req.body;
  try {
    const result = await pool.query(
      'UPDATE notes SET text = $1, image_url = $2 WHERE id = $3 RETURNING *',
      [text || null, image_url || null, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}
