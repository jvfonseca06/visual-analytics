
import * as duckdb from '@duckdb/duckdb-wasm';

let db;
let conexao;

export async function iniciarDuckDB() {
    // Seleciona os arquivos do DuckDB-Wasm
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);

    // Cria o Worker usando um endereço local
    const workerUrl = new URL(
        '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
        import.meta.url
    );

    const worker = new Worker(workerUrl, {
        type: 'module'
    });

    const logger = new duckdb.ConsoleLogger();

    db = new duckdb.AsyncDuckDB(logger, worker);

    await db.instantiate(
        bundle.mainModule,
        bundle.pthreadWorker
    );

    conexao = await db.connect();

    // Carrega o CSV
    const resposta = await fetch('/data/matches.csv');

    if (!resposta.ok) {
        throw new Error('Não foi possível carregar o CSV.');
    }

    const arquivo = new Uint8Array(
        await resposta.arrayBuffer()
    );

    await db.registerFileBuffer('matches.csv', arquivo);

    await conexao.query(`
        CREATE OR REPLACE TABLE partidas AS
        SELECT *
        FROM read_csv_auto('matches.csv', header = true)
    `);

    return conexao;
}
