import db from '../config/db.js';

export async function getAllServices(req, res) {
  try {
    const services = await db.all('SELECT id, nom, code FROM services ORDER BY id ASC');
    res.json(services);
  } catch (err) {
    console.error('Erreur récupération des services:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des services.' });
  }
}
