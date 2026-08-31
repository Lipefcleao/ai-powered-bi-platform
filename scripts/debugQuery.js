import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

async function debug() {
  try {
    const envContent = await fs.readFile('.env', 'utf8');
    const config = {};
    envContent.split('\n').forEach(line => {
      if (line.includes('Server:')) config.host = line.split('Server:')[1].trim();
      if (line.includes('Username:')) config.user = line.split('Username:')[1].trim();
      if (line.includes('Password:')) config.password = line.split('Password:')[1].trim();
    });
    config.database = 'FAST';
    config.port = 3306;

    const connection = await mysql.createConnection(config);
    
    // 1. Get Project ID for Alternativ
    const [projects] = await connection.execute("SELECT Id, Name FROM costcenters WHERE Name = 'Alternativ'");
    const altId = projects[0].Id;
    console.log(`🔍 Project ID for Alternativ: ${altId}`);

    // 2. Raw total from reportagem
    const [rawTotal] = await connection.execute(`
      SELECT SUM(HorasTrabalhadas) as total 
      FROM reportagem 
      WHERE Projeto_Id = ? OR Task_Id IN (
        SELECT t.Id FROM tasks t 
        JOIN boards b ON t.BoardId = b.Id 
        WHERE b.CostCenterId = ?
      )
    `, [altId, altId]);
    console.log(`📊 Raw Total (Projeto_Id or Task->Board->CostCenter): ${rawTotal[0].total}`);

    // 3. Total from current CTE 1 logic
    const [cte1Total] = await connection.execute(`
      SELECT SUM(r.HorasTrabalhadas) AS HorasTotais
      FROM reportagem r
      LEFT JOIN tasks t ON r.Task_Id = t.Id
      LEFT JOIN boards b ON t.BoardId = b.Id
      WHERE COALESCE(b.CostCenterId, r.Projeto_Id) = ?
    `, [altId]);
    console.log(`📊 CTE 1 Logic Total: ${cte1Total[0].HorasTotais}`);

    // 4. Look for reports with 7.00 hours
    const [sevenHours] = await connection.execute(`
      SELECT r.Id, r.HorasTrabalhadas, r.Task_Id, r.Projeto_Id, t.Active
      FROM reportagem r
      LEFT JOIN tasks t ON r.Task_Id = t.Id
      WHERE (COALESCE(r.Projeto_Id, (SELECT b.CostCenterId FROM boards b JOIN tasks tx ON tx.BoardId = b.Id WHERE tx.Id = r.Task_Id)) = ?)
      AND r.HorasTrabalhadas = 7
    `, [altId]);
    console.log(`❓ Reports with 7.00 hours found:`, sevenHours);

    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
debug();
