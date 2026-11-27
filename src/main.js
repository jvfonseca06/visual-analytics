
import { iniciarDuckDB } from './data/duckdb.js';

const status = document.querySelector('#status');

async function iniciarProjeto() {
    try {
        status.textContent = 'Carregando dados...';

        // Inicializa o DuckDB e carrega as partidas
        const conexao = await iniciarDuckDB();

        status.textContent = 'Calculando classificação...';

        // Consulta SQL para calcular a classificação de 2025
        const resultado = await conexao.query(`
            WITH jogos AS (
                -- Dados dos clubes que jogaram em casa
                SELECT
                    home AS clube,
                    CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_pro,
                    CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_contra
                FROM partidas
                WHERE season = 2025
                  AND regexp_matches(score, '^[0-9]+x[0-9]+$')

                UNION ALL

                -- Dados dos clubes que jogaram fora de casa
                SELECT
                    away AS clube,
                    CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_pro,
                    CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_contra
                FROM partidas
                WHERE season = 2025
                  AND regexp_matches(score, '^[0-9]+x[0-9]+$')
            )

            SELECT
                clube,
                COUNT(*) AS jogos,

                SUM(
                    CASE WHEN gols_pro > gols_contra
                    THEN 1 ELSE 0 END
                ) AS vitorias,

                SUM(
                    CASE WHEN gols_pro = gols_contra
                    THEN 1 ELSE 0 END
                ) AS empates,

                SUM(
                    CASE WHEN gols_pro < gols_contra
                    THEN 1 ELSE 0 END
                ) AS derrotas,

                SUM(gols_pro) AS gols_pro,
                SUM(gols_contra) AS gols_contra,

                SUM(gols_pro) - SUM(gols_contra) AS saldo_gols,

                SUM(
                    CASE
                        WHEN gols_pro > gols_contra THEN 3
                        WHEN gols_pro = gols_contra THEN 1
                        ELSE 0
                    END
                ) AS pontos

            FROM jogos
            GROUP BY clube

            ORDER BY
                pontos DESC,
                vitorias DESC,
                saldo_gols DESC,
                gols_pro DESC
        `);

        // Converte os resultados para objetos JavaScript
        const classificacao = resultado.toArray().map(linha => ({
            clube: linha.clube,
            jogos: Number(linha.jogos),
            vitorias: Number(linha.vitorias),
            empates: Number(linha.empates),
            derrotas: Number(linha.derrotas),
            gols_pro: Number(linha.gols_pro),
            gols_contra: Number(linha.gols_contra),
            saldo_gols: Number(linha.saldo_gols),
            pontos: Number(linha.pontos)
        }));

        // Exibe a classificação no console
        console.table(classificacao);

        // Consulta o desempenho dos clubes em casa e fora
const desempenho = await conexao.query(`
    WITH jogos AS (
        -- Desempenho jogando em casa
        SELECT
            home AS clube,
            'Casa' AS local,
            CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_pro,
            CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_contra
        FROM partidas
        WHERE season = 2025
          AND regexp_matches(score, '^[0-9]+x[0-9]+$')

        UNION ALL

        -- Desempenho jogando fora
        SELECT
            away AS clube,
            'Fora' AS local,
            CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_pro,
            CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_contra
        FROM partidas
        WHERE season = 2025
          AND regexp_matches(score, '^[0-9]+x[0-9]+$')
    )

    SELECT
        clube,
        local,
        COUNT(*) AS jogos,

        SUM(CASE WHEN gols_pro > gols_contra THEN 1 ELSE 0 END) AS vitorias,
        SUM(CASE WHEN gols_pro = gols_contra THEN 1 ELSE 0 END) AS empates,
        SUM(CASE WHEN gols_pro < gols_contra THEN 1 ELSE 0 END) AS derrotas,

        SUM(gols_pro) AS gols_pro,
        SUM(gols_contra) AS gols_contra,

        SUM(
            CASE
                WHEN gols_pro > gols_contra THEN 3
                WHEN gols_pro = gols_contra THEN 1
                ELSE 0
            END
        ) AS pontos

    FROM jogos
    GROUP BY clube, local
    ORDER BY clube, local
`);

const desempenhoCasaFora = desempenho.toArray().map(linha => ({
    clube: linha.clube,
    local: linha.local,
    jogos: Number(linha.jogos),
    vitorias: Number(linha.vitorias),
    empates: Number(linha.empates),
    derrotas: Number(linha.derrotas),
    gols_pro: Number(linha.gols_pro),
    gols_contra: Number(linha.gols_contra),
    pontos: Number(linha.pontos)
}));

console.table(desempenhoCasaFora);

        status.textContent =
            `Classificação calculada! ${classificacao.length} clubes encontrados. Confira o console (F12).`;

    } catch (erro) {
        console.error('Erro ao executar o projeto:', erro);

        status.textContent =
            'Erro ao calcular a classificação. Confira o console.';
    }
}

iniciarProjeto();
