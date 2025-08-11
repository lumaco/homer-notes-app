export default function handler(req, res) {
  res.status(200).json({
    DATABASE_URL: process.env.DATABASE_URL || 'NON DEFINITA',
  });
}
