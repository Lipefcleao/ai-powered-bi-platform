import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

const MODULES = {
  allocations: {
    sql: 'queries/allocations.sql',
    output: 'src/data/allocations.json'
  },
  sales: {
    sql: 'queries/sales_vs_budget.sql',
    output: 'src/data/sales.json'
  }
};

async function sync(moduleName) {
  if (!MODULES[moduleName]) {
    console.error(`❌ Módulo '${moduleName}' não encontrado. Opções: ${Object.keys(MODULES).join(', ')}`);
    process.exit(1);
  }

  const mod = MODULES[moduleName];

  try {
    console.log(`🚀 Iniciando sincronização para: ${moduleName.toUpperCase()}...`);

    // 1. Parse .env manual (devido ao formato customizado)
    const envPath = path.resolve('.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    const config = {};
    envContent.split('\n').forEach(line => {
      if (line.includes('Server:')) config.host = line.split('Server:')[1].trim();
      if (line.includes('Username:')) config.user = line.split('Username:')[1].trim();
      if (line.includes('Password:')) config.password = line.split('Password:')[1].trim();
    });

    config.database = 'FAST'; 
    config.port = 3306;

    console.log(`📡 Conectando ao banco: ${config.host}...`);

    // 2. Ler SQL
    const sqlPath = path.resolve(mod.sql);
    const sqlQuery = await fs.readFile(sqlPath, 'utf8');

    // 3. Conectar e executar
    const connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida.');

    const [rows] = await connection.execute(sqlQuery);
    console.log(`📊 Query executada com sucesso. ${rows.length} registros retornados.`);

    // 4. Salvar resultado
    const outputPath = path.resolve(mod.output);
    
    // Garantir que diretórios existem
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    await fs.writeFile(outputPath, JSON.stringify(rows, null, 2), 'utf8');
    
    console.log(`💾 Dados salvos em: ${outputPath}`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    process.exit(1);
  }
}

const arg = process.argv[2];
if (!arg) {
  console.log('💡 Uso: node scripts/sync.js [nome_do_modulo]');
  process.exit(1);
}

sync(arg);
