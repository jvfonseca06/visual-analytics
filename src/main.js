
import { iniciarDuckDB } from './data/duckdb.js';

import {
    buscarTemporadas,
    buscarDadosPainel
} from './data/consultas.js';

const status = document.querySelector('#status');

async function iniciarProjeto() {
    try {
        status.textContent = 'Carregando dados...';

        // Inicializa o DuckDB e carrega o CSV
        const conexao = await iniciarDuckDB();

        // Busca as temporadas disponíveis
        const temporadas = await buscarTemporadas(conexao);

        // Define a temporada inicial
        const temporadaAtual = 2025;

        // Reúne todos os dados do painel
        const dadosPainel = await buscarDadosPainel(
            conexao,
            temporadaAtual
        );

        // Exibe os resultados para conferência
        console.log('Temporadas disponíveis:', temporadas);
        console.log('Dados completos do painel:', dadosPainel);

        status.textContent =
            `Dados carregados! Temporada ${temporadaAtual}.`;

    } catch (erro) {
        console.error('Erro ao executar o projeto:', erro);

        status.textContent =
            'Erro ao carregar os dados. Confira o console.';
    }
}

iniciarProjeto();
