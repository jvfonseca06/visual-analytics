
export async function buscarClassificacao(conexao, temporada = 2025) {
    const resultado = await conexao.query(`
        WITH jogos AS (
            SELECT
                home AS clube,
                CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_pro,
                CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_contra
            FROM partidas
            WHERE season = ${temporada}
              AND regexp_matches(score, '^[0-9]+x[0-9]+$')

            UNION ALL

            SELECT
                away AS clube,
                CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_pro,
                CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_contra
            FROM partidas
            WHERE season = ${temporada}
              AND regexp_matches(score, '^[0-9]+x[0-9]+$')
        )

        SELECT
            clube,
            COUNT(*) AS jogos,
            SUM(CASE WHEN gols_pro > gols_contra THEN 1 ELSE 0 END) AS vitorias,
            SUM(CASE WHEN gols_pro = gols_contra THEN 1 ELSE 0 END) AS empates,
            SUM(CASE WHEN gols_pro < gols_contra THEN 1 ELSE 0 END) AS derrotas,
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
        ORDER BY pontos DESC, vitorias DESC, saldo_gols DESC, gols_pro DESC
    `);

    return resultado.toArray().map(linha => ({
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
}

export async function buscarDesempenhoCasaFora(conexao, temporada = 2025) {
    const resultado = await conexao.query(`
        WITH jogos AS (
            SELECT
                home AS clube,
                'Casa' AS local,
                CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_pro,
                CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_contra
            FROM partidas
            WHERE season = ${temporada}
              AND regexp_matches(score, '^[0-9]+x[0-9]+$')

            UNION ALL

            SELECT
                away AS clube,
                'Fora' AS local,
                CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_pro,
                CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_contra
            FROM partidas
            WHERE season = ${temporada}
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

    return resultado.toArray().map(linha => ({
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
}


export async function buscarTemporadas(conexao) {
    const resultado = await conexao.query(`
        SELECT DISTINCT
            CAST(season AS INTEGER) AS temporada
        FROM partidas
        ORDER BY temporada DESC
    `);

    return resultado.toArray().map(linha => Number(linha.temporada));
}


export async function buscarIndicadoresGerais(conexao, temporada = 2025) {
    const resultado = await conexao.query(`
        WITH jogos AS (
            SELECT
                home AS mandante,
                away AS visitante,
                CAST(split_part(score, 'x', 1) AS INTEGER) AS gols_casa,
                CAST(split_part(score, 'x', 2) AS INTEGER) AS gols_fora
            FROM partidas
            WHERE season = ${temporada}
              AND regexp_matches(score, '^[0-9]+x[0-9]+$')
        )

        SELECT
            COUNT(*) AS total_partidas,
            SUM(gols_casa + gols_fora) AS total_gols,
            ROUND(AVG(gols_casa + gols_fora), 2) AS media_gols,
            COUNT(DISTINCT mandante) AS total_clubes
        FROM jogos
    `);

    const linha = resultado.toArray()[0];

    return {
        total_partidas: Number(linha.total_partidas),
        total_gols: Number(linha.total_gols),
        media_gols: Number(linha.media_gols),
        total_clubes: Number(linha.total_clubes)
    };
}



export async function buscarDadosPainel(conexao, temporada = 2025) {
    const [
        classificacao,
        desempenhoCasaFora,
        indicadores,
        evolucaoTemporal
    ] = await Promise.all([
        buscarClassificacao(conexao, temporada),
        buscarDesempenhoCasaFora(conexao, temporada),
        buscarIndicadoresGerais(conexao, temporada),
        buscarEvolucaoTemporal(conexao, temporada)
    ]);

    return {
        temporada,
        classificacao,
        desempenhoCasaFora,
        indicadores,
        evolucaoTemporal
    };
}


export async function buscarEvolucaoTemporal(conexao, temporada = 2025) {
    const resultado = await conexao.query(`
        SELECT
            strftime(date, '%Y-%m') AS mes,

            COUNT(*) AS total_partidas,

            SUM(
                CAST(split_part(score, 'x', 1) AS INTEGER) +
                CAST(split_part(score, 'x', 2) AS INTEGER)
            ) AS total_gols,

            ROUND(
                AVG(
                    CAST(split_part(score, 'x', 1) AS INTEGER) +
                    CAST(split_part(score, 'x', 2) AS INTEGER)
                ),
                2
            ) AS media_gols

        FROM partidas

        WHERE season = ${temporada}
          AND regexp_matches(score, '^[0-9]+x[0-9]+$')

        GROUP BY mes
        ORDER BY mes
    `);

    return resultado.toArray().map(linha => ({
        mes: linha.mes,
        total_partidas: Number(linha.total_partidas),
        total_gols: Number(linha.total_gols),
        media_gols: Number(linha.media_gols)
    }));
}

