import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

async function syncData() {
  try {
    console.log('🚀 Iniciando sincronização de dados reais...');

    // 1. Parse .env manual (devido ao formato customizado)
    const envPath = path.resolve('.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    const config = {};
    envContent.split('\n').forEach(line => {
      if (line.includes('Server:')) config.host = line.split('Server:')[1].trim();
      if (line.includes('Username:')) config.user = line.split('Username:')[1].trim();
      if (line.includes('Password:')) config.password = line.split('Password:')[1].trim();
    });

    config.database = 'FAST'; // Conforme o .env padrão do outro diretório e contexto do projeto
    config.port = 3306;

    console.log(`📡 Conectando ao banco: ${config.host}...`);

    // 2. Ler SQL de SQLConfig
    const sqlPath = path.resolve('SQLConfig');
    const sqlQuery = await fs.readFile(sqlPath, 'utf8');

    // 3. Conectar e executar
    const connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida.');

    const [rows] = await connection.execute(sqlQuery);
    console.log(`📊 Query executada com sucesso. ${rows.length} registros retornados.`);

    // 4. Salvar resultado em src/realData.json
    const outputPath = path.resolve('src', 'realData.json');
    await fs.writeFile(outputPath, JSON.stringify(rows, null, 2), 'utf8');
    
    console.log(`💾 Dados salvos em: ${outputPath}`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    process.exit(1);
  }
}

syncData();
