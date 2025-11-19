




// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa as bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const { Connection, Request, TYPES } = require('tedious');

// --- Configuração das Conexões com os Bancos de Dados ---
const configOdin = {
  server: process.env.DB_SERVER_ODIN,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER_ODIN,
      password: process.env.DB_PASSWORD_ODIN,
    },
  },
  options: {
    encrypt: true,
    database: process.env.DB_DATABASE_ODIN,
    rowCollectionOnRequestCompletion: true,
    trustServerCertificate: true,
  },
};

const configErp = {
  server: process.env.DB_SERVER_ERP,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER_ERP,
      password: process.env.DB_PASSWORD_ERP,
    },
  },
  options: {
    encrypt: true,
    database: process.env.DB_DATABASE_ERP,
    rowCollectionOnRequestCompletion: true,
    trustServerCertificate: true,
  },
};

// --- Função Auxiliar para Executar Queries ---
function executeQuery(config, query, params = []) {
  return new Promise((resolve, reject) => {
    const connection = new Connection(config);
    connection.on('connect', (err) => {
      if (err) return reject(new Error(`Falha na conexão com o banco de dados: ${err.message}`));
      
      const request = new Request(query, (err, rowCount, rows) => {
        connection.close();
        if (err) return reject(new Error(`Erro ao executar a consulta: ${err.message}`));
        
        const result = rows.map(row => {
          const obj = {};
          row.forEach(column => { obj[column.metadata.colName] = column.value; });
          return obj;
        });
        resolve({ rows: result, rowCount });
      });

      // CORREÇÃO: Passar 'param.options' para suportar { scale: 2 } em decimais
      params.forEach(param => { request.addParameter(param.name, param.type, param.value, param.options); });
      connection.execSql(request);
    });
    connection.connect();
  });
}

// --- Criação do Servidor Express ---
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.API_PORT || 3000;

app.get('/', (req, res) => res.send('API do Sistema de Fretes está funcionando!'));


// --- Endpoints ---

// VEÍCULOS
app.get('/veiculos', async (req, res) => {
  try {
    const { rows } = await executeQuery(configOdin, 'SELECT * FROM Veiculos ORDER BY Ativo DESC, Placa ASC');
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/veiculos', async (req, res) => {
    const v = req.body;
    // Adicionado Origem
    const query = `INSERT INTO Veiculos (COD_Veiculo, Placa, TipoVeiculo, Motorista, CapacidadeKG, Ativo, Origem) 
                   OUTPUT INSERTED.* 
                   VALUES (@cod, @placa, @tipo, @motorista, @cap, @ativo, @origem);`;
    const params = [
        { name: 'cod', type: TYPES.NVarChar, value: v.COD_Veiculo }, { name: 'placa', type: TYPES.NVarChar, value: v.Placa },
        { name: 'tipo', type: TYPES.NVarChar, value: v.TipoVeiculo }, { name: 'motorista', type: TYPES.NVarChar, value: v.Motorista },
        { name: 'cap', type: TYPES.Int, value: v.CapacidadeKG }, { name: 'ativo', type: TYPES.Bit, value: v.Ativo },
        { name: 'origem', type: TYPES.NVarChar, value: v.Origem || 'Manual' }
    ];
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.status(201).json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/veiculos/:id', async (req, res) => {
    const v = req.body;
    const query = `UPDATE Veiculos SET COD_Veiculo=@cod, Placa=@placa, TipoVeiculo=@tipo, Motorista=@motorista, CapacidadeKG=@cap, Ativo=@ativo 
                   OUTPUT INSERTED.* 
                   WHERE ID_Veiculo = @id;`;
    const params = [
        { name: 'id', type: TYPES.Int, value: req.params.id }, { name: 'cod', type: TYPES.NVarChar, value: v.COD_Veiculo },
        { name: 'placa', type: TYPES.NVarChar, value: v.Placa }, { name: 'tipo', type: TYPES.NVarChar, value: v.TipoVeiculo },
        { name: 'motorista', type: TYPES.NVarChar, value: v.Motorista }, { name: 'cap', type: TYPES.Int, value: v.CapacidadeKG },
        { name: 'ativo', type: TYPES.Bit, value: v.Ativo }
    ];
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- IMPORTAÇÃO DE VEÍCULOS DO ERP ---

// 1. CHECAGEM: Compara ERP vs Local
app.get('/veiculos-erp/check', async (req, res) => {
    try {
        // Busca veículos do ERP usando a query fornecida (com JOINs para motorista, modelo e status)
        const erpQuery = `
            SELECT 
                v.codvec AS COD_VEICULO,
                v.numplcvec AS PLACA,
                RTRIM(m.desmdlvec) AS TIPO,
                RTRIM(c.nomepg) AS MOTORISTA,
                v.valcdepsovec AS CAPACIDADE_KG,
                CASE 
                    WHEN v.INDSTUVEC = '1' THEN 'Ativo' 
                    ELSE 'Inativo' 
                END AS STATUS_ATIVO
            FROM flexx10071188.dbo.ibetvec v WITH(NOLOCK)
            LEFT JOIN flexx10071188.dbo.IBETTPLPDRVEC t WITH(NOLOCK)
                ON v.codvec = t.codvec
            LEFT JOIN flexx10071188.dbo.IBETCPLEPG c WITH(NOLOCK)
                ON t.codmtcepg = c.codmtcepg
            LEFT JOIN flexx10071188.dbo.IBETDOMMDLVEC m WITH(NOLOCK)
                ON v.tpomdlvec = m.tpomdlvec
            WHERE c.tpoepg = 'm'
        `;
        const { rows: erpVehicles } = await executeQuery(configErp, erpQuery);
        
        if (erpVehicles.length === 0) {
            return res.json({ newVehicles: [], conflicts: [], message: 'Nenhum veículo de motorista (tipo M) encontrado no ERP.' });
        }

        // Busca veículos locais
        const { rows: localVehicles } = await executeQuery(configOdin, 'SELECT * FROM Veiculos');
        const localMap = new Map();
        localVehicles.forEach(v => localMap.set(v.COD_Veiculo.trim().toUpperCase(), v));

        const newVehicles = [];
        const conflicts = [];

        erpVehicles.forEach(erpV => {
            // Mapeamento seguro dos campos retornados pela query
            const cod = String(erpV.COD_VEICULO).trim().toUpperCase();
            const placa = String(erpV.PLACA || '').trim().toUpperCase();
            const tipo = String(erpV.TIPO || 'PADRÃO').trim();
            const motorista = String(erpV.MOTORISTA || 'N/A').trim();
            const capacidade = Number(erpV.CAPACIDADE_KG) || 0;
            const ativo = erpV.STATUS_ATIVO === 'Ativo';

            const normalizedErp = {
                COD_Veiculo: cod,
                Placa: placa,
                TipoVeiculo: tipo,
                Motorista: motorista,
                CapacidadeKG: capacidade,
                Ativo: ativo,
                Origem: 'ERP'
            };

            if (localMap.has(cod)) {
                const localV = localMap.get(cod);
                // Adiciona à lista de conflitos para decisão do usuário
                conflicts.push({
                    local: localV,
                    erp: normalizedErp,
                    action: 'skip' // Padrão: não sobrescrever
                });
            } else {
                newVehicles.push(normalizedErp);
            }
        });

        res.json({ newVehicles, conflicts, message: 'Checagem concluída.' });

    } catch (error) {
        console.error("Erro ao checar veículos ERP:", error);
        res.status(500).json({ message: `Erro ao consultar ERP: ${error.message}.` });
    }
});

// 2. SINCRONIZAÇÃO: Executa inserções e updates
app.post('/veiculos-erp/sync', async (req, res) => {
    const { newVehicles, vehiclesToUpdate } = req.body;
    
    const connection = new Connection(configOdin);
    connection.connect(err => {
        if (err) return res.status(500).json({ message: `Erro de conexão: ${err.message}` });
        
        connection.beginTransaction(async err => {
            if (err) {
                connection.close();
                return res.status(500).json({ message: `Erro na transação: ${err.message}` });
            }

            try {
                // 1. INSERIR NOVOS (Definindo Origem = 'ERP')
                for (const v of newVehicles) {
                    const insertQ = `INSERT INTO Veiculos (COD_Veiculo, Placa, TipoVeiculo, Motorista, CapacidadeKG, Ativo, Origem) VALUES (@cod, @placa, @tipo, @mot, @cap, @ativo, 'ERP')`;
                    await new Promise((resolve, reject) => {
                        const reqIns = new Request(insertQ, (err) => err ? reject(err) : resolve());
                        reqIns.addParameter('cod', TYPES.NVarChar, v.COD_Veiculo);
                        reqIns.addParameter('placa', TYPES.NVarChar, v.Placa);
                        reqIns.addParameter('tipo', TYPES.NVarChar, v.TipoVeiculo);
                        reqIns.addParameter('mot', TYPES.NVarChar, v.Motorista);
                        reqIns.addParameter('cap', TYPES.Int, v.CapacidadeKG || 0);
                        reqIns.addParameter('ativo', TYPES.Bit, v.Ativo);
                        connection.execSql(reqIns);
                    });
                }

                // 2. ATUALIZAR EXISTENTES (Sobrescrever)
                for (const v of vehiclesToUpdate) {
                     // Atualiza Placa, Tipo, Motorista, Capacidade e Status
                    const updateQ = `UPDATE Veiculos SET Placa=@placa, TipoVeiculo=@tipo, Motorista=@mot, CapacidadeKG=@cap, Ativo=@ativo WHERE COD_Veiculo=@cod`;
                    await new Promise((resolve, reject) => {
                        const reqUpd = new Request(updateQ, (err) => err ? reject(err) : resolve());
                        reqUpd.addParameter('placa', TYPES.NVarChar, v.Placa);
                        reqUpd.addParameter('tipo', TYPES.NVarChar, v.TipoVeiculo);
                        reqUpd.addParameter('mot', TYPES.NVarChar, v.Motorista);
                        reqUpd.addParameter('cap', TYPES.Int, v.CapacidadeKG || 0);
                        reqUpd.addParameter('ativo', TYPES.Bit, v.Ativo);
                        reqUpd.addParameter('cod', TYPES.NVarChar, v.COD_Veiculo);
                        connection.execSql(reqUpd);
                    });
                }

                connection.commitTransaction(err => {
                    if (err) {
                        connection.rollbackTransaction(() => connection.close());
                        return res.status(500).json({ message: `Erro no commit: ${err.message}` });
                    }
                    res.json({ 
                        message: 'Sincronização concluída com sucesso.', 
                        count: newVehicles.length + vehiclesToUpdate.length 
                    });
                    connection.close();
                });

            } catch (error) {
                connection.rollbackTransaction(() => {
                    connection.close();
                    res.status(500).json({ message: `Erro na sincronização: ${error.message}` });
                });
            }
        });
    });
});


// CARGAS MANUAIS
app.get('/cargas-manuais', async (req, res) => {
  try {
    const { rows } = await executeQuery(configOdin, 'SELECT * FROM CargasManuais ORDER BY DataCTE DESC');
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/cargas-manuais', async (req, res) => {
    const c = req.body;
    const query = `INSERT INTO CargasManuais (NumeroCarga, Cidade, ValorCTE, DataCTE, KM, COD_VEICULO, Origem) 
                   OUTPUT INSERTED.* 
                   VALUES (@num, @cidade, @valor, @data, @km, @cod, @origem);`;
    const params = [
        { name: 'num', type: TYPES.NVarChar, value: String(c.NumeroCarga) }, { name: 'cidade', type: TYPES.NVarChar, value: c.Cidade },
        { name: 'valor', type: TYPES.Decimal, value: c.ValorCTE, options: { precision: 18, scale: 2 } }, { name: 'data', type: TYPES.Date, value: c.DataCTE },
        { name: 'km', type: TYPES.Int, value: c.KM }, { name: 'cod', type: TYPES.NVarChar, value: c.COD_VEICULO },
        { name: 'origem', type: TYPES.NVarChar, value: c.Origem || 'Manual' },
    ];
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.status(201).json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/cargas-manuais/:id', async (req, res) => {
    const c = req.body;
    const id = req.params.id;
    let query, params;
    if (c.Excluido) { // Lógica para exclusão lógica
        query = `UPDATE CargasManuais SET Excluido = @excluido, MotivoExclusao = @motivo OUTPUT INSERTED.* WHERE ID_Carga = @id;`;
        params = [
            { name: 'id', type: TYPES.Int, value: id }, { name: 'excluido', type: TYPES.Bit, value: true },
            { name: 'motivo', type: TYPES.NVarChar, value: c.MotivoExclusao },
        ];
    } else { // Lógica para edição (AGORA INCLUI MOTIVO ALTERACAO)
        query = `UPDATE CargasManuais SET NumeroCarga = @num, Cidade = @cidade, ValorCTE = @valor, DataCTE = @data, KM = @km, COD_VEICULO = @cod, MotivoAlteracao = @motivoAlt OUTPUT INSERTED.* WHERE ID_Carga = @id;`;
        params = [
            { name: 'id', type: TYPES.Int, value: id }, { name: 'num', type: TYPES.NVarChar, value: String(c.NumeroCarga) },
            { name: 'cidade', type: TYPES.NVarChar, value: c.Cidade }, { name: 'valor', type: TYPES.Decimal, value: c.ValorCTE, options: { precision: 18, scale: 2 } },
            { name: 'data', type: TYPES.Date, value: c.DataCTE }, { name: 'km', type: TYPES.Int, value: c.KM },
            { name: 'cod', type: TYPES.NVarChar, value: c.COD_VEICULO },
            { name: 'motivoAlt', type: TYPES.NVarChar, value: c.MotivoAlteracao || null }
        ];
    }
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});


// IMPORTAÇÃO DE CARGAS DO ERP (NOVOS ENDPOINTS COM VERIFICAÇÃO DE EXCLUSÃO)

// 1. CHECK: Identifica Novas vs Excluídas
app.post('/cargas-erp/check', async (req, res) => {
    const { sIni, sFim } = req.body;
    if (!sIni || !sFim) return res.status(400).json({ message: 'Datas de início (sIni) e fim (sFim) são obrigatórias.'});

    try {
        // 1.1 Buscar dados brutos do ERP com query robusta (JOINs completos)
        const erpQuery = `
            SELECT
             PDD.NUMSEQETGPDD AS NumeroCarga,
             RTRIM(LTRIM(PDD.CODVEC)) AS COD_VEICULO,
             LVR.DATEMSNF_LVRSVC AS DataCTE,
             CAST(ISNULL(LVR.VALSVCTOTLVRSVC, 0) AS DECIMAL(18, 2)) AS ValorCTE,
             RTRIM(ISNULL(CDD.DESCDD, 'N/A')) AS Cidade
            FROM Flexx10071188.dbo.IRFTLVRSVC LVR (NOLOCK)
            LEFT JOIN Flexx10071188.dbo.IBETPDDSVCNF_ PDD (NOLOCK)
              ON PDD.CODEMP = LVR.CODEMP
             AND PDD.NUMDOCTPTPDD = LVR.NUMNF_LVRSVC
             AND PDD.INDSERDOCTPTPDD = LVR.CODSERNF_LVRSVC
            LEFT JOIN Flexx10071188.dbo.IBETCET CET (NOLOCK)
              ON LVR.CODEMP = CET.CODEMP AND LVR.CODCET = CET.CODCET
            LEFT JOIN Flexx10071188.dbo.IBETEDRCET EDR (NOLOCK)
              ON CET.CODEMP = EDR.CODEMP AND CET.CODCET = EDR.CODCET AND EDR.CODTPOEDR = 1
            LEFT JOIN Flexx10071188.dbo.IBETCDD CDD (NOLOCK)
              ON EDR.CODEMP = CDD.CODEMP AND EDR.CODPAS = CDD.CODPAS AND EDR.CODUF_ = CDD.CODUF_ AND EDR.CODCDD = CDD.CODCDD
            WHERE LVR.DATEMSNF_LVRSVC BETWEEN @sIni AND @sFim
              AND LVR.INDSTULVRSVC = 1
              AND PDD.NUMSEQETGPDD IS NOT NULL
              AND CDD.DESCDD IS NOT NULL
        `;
        const erpParams = [{ name: 'sIni', type: TYPES.Date, value: sIni }, { name: 'sFim', type: TYPES.Date, value: sFim }];
        const { rows: erpRows } = await executeQuery(configErp, erpQuery, erpParams);

        if (erpRows.length === 0) return res.json({ message: 'Nenhuma carga nova encontrada no ERP para o período.', newCargas: [], deletedCargas: [], missingVehicles: [] });

        // 1.2 Agregação de Cargas (para lidar com duplicatas no ERP)
        const aggregated = new Map();
        erpRows.forEach(row => {
            const key = `${row.NumeroCarga}|${row.Cidade}`;
            if(row.COD_VEICULO) row.COD_VEICULO = row.COD_VEICULO.toString().trim().toUpperCase();
            
            if (aggregated.has(key)) {
                aggregated.get(key).ValorCTE += row.ValorCTE;
            } else {
                aggregated.set(key, { ...row });
            }
        });

        // 1.3 Preparar Veículos e Parâmetros Locais para completar os dados (KM)
        const { rows: veiculos } = await executeQuery(configOdin, 'SELECT COD_Veiculo, TipoVeiculo FROM Veiculos');
        const veiculoMap = new Map(veiculos.map(v => [v.COD_Veiculo.trim().toUpperCase(), v.TipoVeiculo]));
        const { rows: paramsValores } = await executeQuery(configOdin, 'SELECT Cidade, TipoVeiculo, KM FROM ParametrosValores');

        const missingVehicles = new Set();

        // Função auxiliar para completar dados (KM)
        const enrichCarga = (carga) => {
             if (!carga.COD_VEICULO) return null;
             const veiculoCodeNormalized = carga.COD_VEICULO;
             
             if (!veiculoMap.has(veiculoCodeNormalized)) {
                 missingVehicles.add(veiculoCodeNormalized);
                 return null;
             }
             const tipoVeiculo = veiculoMap.get(veiculoCodeNormalized);
             const param = paramsValores.find(p => p.Cidade === carga.Cidade && p.TipoVeiculo === tipoVeiculo) || 
                           paramsValores.find(p => p.Cidade === 'Qualquer' && p.TipoVeiculo === tipoVeiculo);
             return { ...carga, KM: param ? param.KM : 0 };
        };

        // 1.4 Verificar status no Banco Local (Check Existing & Deleted)
        const { rows: localCargas } = await executeQuery(configOdin, "SELECT NumeroCarga, Cidade, Excluido, MotivoExclusao FROM CargasManuais WHERE Origem = 'ERP'");
        const localMap = new Map();
        localCargas.forEach(c => {
             localMap.set(`${c.NumeroCarga}|${c.Cidade}`, c);
        });

        const newCargas = [];
        const deletedCargas = [];

        for (const cargaErp of aggregated.values()) {
            const enriched = enrichCarga(cargaErp);
            if (!enriched) continue; // Pula se não tem veículo

            const key = `${enriched.NumeroCarga}|${enriched.Cidade}`;
            
            if (localMap.has(key)) {
                const local = localMap.get(key);
                if (local.Excluido) {
                    // Existe, mas está excluída. Candidata a reativação.
                    deletedCargas.push({
                        erp: enriched,
                        local: local,
                        motivoExclusao: local.MotivoExclusao,
                        selected: false // Frontend vai definir
                    });
                }
                // Se existe e Excluido=0, ignora (já está importada e ativa)
            } else {
                // Não existe, é nova.
                newCargas.push(enriched);
            }
        }
        
        res.json({
            newCargas,
            deletedCargas,
            message: 'Verificação concluída.',
            missingVehicles: Array.from(missingVehicles)
        });

    } catch (error) {
        console.error("Erro no check ERP:", error);
        res.status(500).json({ message: error.message });
    }
});

// 2. SYNC: Inserir Novas e Reativar Excluídas
app.post('/cargas-erp/sync', async (req, res) => {
    const { newCargas, cargasToReactivate } = req.body;
    
    const connection = new Connection(configOdin);
    connection.connect(err => {
        if (err) return res.status(500).json({ message: `Erro de conexão: ${err.message}` });
        
        connection.beginTransaction(async err => {
            if (err) {
                connection.close();
                return res.status(500).json({ message: `Erro na transação: ${err.message}` });
            }

            try {
                // 2.1 Inserção em Lote das NOVAS Cargas
                const BATCH_SIZE = 200;
                if (newCargas.length > 0) {
                    for (let i = 0; i < newCargas.length; i += BATCH_SIZE) {
                        const batch = newCargas.slice(i, i + BATCH_SIZE);
                        let query = "INSERT INTO CargasManuais (NumeroCarga, Cidade, ValorCTE, DataCTE, KM, COD_VEICULO, Origem) VALUES ";
                        const params = [];
                        
                        batch.forEach((c, index) => {
                            query += index > 0 ? ", " : "";
                            query += `(@num${index}, @cidade${index}, @valor${index}, @data${index}, @km${index}, @cod${index}, 'ERP')`;
                            params.push(
                                { name: `num${index}`, type: TYPES.NVarChar, value: String(c.NumeroCarga) },
                                { name: `cidade${index}`, type: TYPES.NVarChar, value: c.Cidade },
                                { name: `valor${index}`, type: TYPES.Decimal, value: c.ValorCTE, options: { precision: 18, scale: 2 } },
                                { name: `data${index}`, type: TYPES.Date, value: c.DataCTE },
                                { name: `km${index}`, type: TYPES.Int, value: c.KM },
                                { name: `cod${index}`, type: TYPES.NVarChar, value: c.COD_VEICULO }
                            );
                        });
                        query += ";";

                        await new Promise((resolve, reject) => {
                            const request = new Request(query, (err) => err ? reject(err) : resolve());
                            params.forEach(p => request.addParameter(p.name, p.type, p.value, p.options));
                            connection.execSql(request);
                        });
                    }
                }

                // 2.2 Reativação das Cargas Excluídas (UPDATE)
                // Usamos loop simples aqui pois updates em lote complexos podem ser tricky com chaves compostas.
                // Como a reativação geralmente é manual e em menor volume, é seguro.
                if (cargasToReactivate.length > 0) {
                     for (const c of cargasToReactivate) {
                        // Remove Excluido, limpa MotivoExclusao, e atualiza Valor/Data/KM para refletir o ERP atual
                        const updateQ = `
                            UPDATE CargasManuais 
                            SET Excluido = 0, MotivoExclusao = NULL, 
                                ValorCTE = @valor, DataCTE = @data, KM = @km, MotivoAlteracao = 'Reativado via Importação ERP'
                            WHERE NumeroCarga = @num AND Cidade = @cidade AND Origem = 'ERP'
                        `;
                        await new Promise((resolve, reject) => {
                            const reqUpd = new Request(updateQ, (err) => err ? reject(err) : resolve());
                            reqUpd.addParameter('num', TYPES.NVarChar, String(c.NumeroCarga));
                            reqUpd.addParameter('cidade', TYPES.NVarChar, c.Cidade);
                            reqUpd.addParameter('valor', TYPES.Decimal, c.ValorCTE, { precision: 18, scale: 2 });
                            reqUpd.addParameter('data', TYPES.Date, c.DataCTE);
                            reqUpd.addParameter('km', TYPES.Int, c.KM);
                            connection.execSql(reqUpd);
                        });
                    }
                }

                connection.commitTransaction(err => {
                    if (err) {
                        connection.rollbackTransaction(() => connection.close());
                        return res.status(500).json({ message: `Erro no commit: ${err.message}` });
                    }
                    res.json({ 
                        message: 'Sincronização concluída com sucesso.', 
                        count: newCargas.length + cargasToReactivate.length 
                    });
                    connection.close();
                });

            } catch (error) {
                connection.rollbackTransaction(() => {
                    connection.close();
                    res.status(500).json({ message: `Erro ao sincronizar cargas: ${error.message}` });
                });
            }
        });
    });
});

// LANÇAMENTOS
app.get('/lancamentos', async (req, res) => {
    try {
        const { rows: lancamentos } = await executeQuery(configOdin, 'SELECT * FROM Lancamentos ORDER BY DataCriacao DESC');
        for (const lancamento of lancamentos) {
            const params = [{ name: 'id', type: TYPES.Int, value: lancamento.ID_Lancamento }];
            const { rows: cargas } = await executeQuery(configOdin, 'SELECT * FROM Lancamento_Cargas WHERE ID_Lancamento = @id', params);
            lancamento.Cargas = cargas.map(c => ({
                ID_Carga: c.ID_Carga_Origem, NumeroCarga: c.NumeroCarga, Cidade: c.Cidade,
                ValorCTE: c.ValorCTE, DataCTE: c.DataCTE.toISOString().split('T')[0], KM: c.KM, COD_VEICULO: c.COD_VEICULO,
            }));
            lancamento.Calculo = {
                CidadeBase: lancamento.CidadeBase, KMBase: lancamento.KMBase, ValorBase: lancamento.ValorBase, Pedagio: lancamento.Pedagio,
                Balsa: lancamento.Balsa, Ambiental: lancamento.Ambiental, Chapa: lancamento.Chapa, Outras: lancamento.Outras, ValorTotal: lancamento.ValorTotal
            };
        }
        res.json(lancamentos);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/lancamentos', (req, res) => {
    const l = req.body;
    const calc = l.Calculo;

    const connection = new Connection(configOdin);
    connection.connect(err => {
        if (err) return res.status(500).json({ message: `Erro de conexão para criar lançamento: ${err.message}` });
        connection.beginTransaction(err => {
            if (err) return res.status(500).json({ message: `Erro ao iniciar transação: ${err.message}` });
            
            const insertLancamentoQuery = `
                INSERT INTO Lancamentos (DataFrete, ID_Veiculo, CidadeBase, KMBase, ValorBase, Pedagio, Balsa, Ambiental, Chapa, Outras, ValorTotal, Usuario, Motivo)
                OUTPUT INSERTED.*
                VALUES (@data, @idv, @cidade, @km, @vb, @ped, @balsa, @amb, @chapa, @outras, @vt, @user, @motivo);
            `;
            const requestLancamento = new Request(insertLancamentoQuery, (err, rowCount, rows) => {
                if (err) return connection.rollbackTransaction(() => res.status(500).json({ message: `Erro ao inserir lançamento: ${err.message}` }));
                
                const newLancamento = rows[0].reduce((obj, col) => { obj[col.metadata.colName] = col.value; return obj; }, {});
                const newLancamentoId = newLancamento.ID_Lancamento;
                
                if (l.Cargas.length === 0) {
                    connection.commitTransaction(err => {
                        if (err) return connection.rollbackTransaction(() => res.status(500).json({ message: `Erro ao commitar transação vazia: ${err.message}` }));
                        res.status(201).json({ ...newLancamento, Cargas: [], Calculo: calc });
                        connection.close();
                    });
                    return;
                }

                let cargasCompleted = 0;
                l.Cargas.forEach(c => {
                    const insertCargaQuery = `
                        INSERT INTO Lancamento_Cargas (ID_Lancamento, ID_Carga_Origem, NumeroCarga, Cidade, ValorCTE, DataCTE, KM, COD_VEICULO)
                        VALUES (@idl, @idc, @num, @cidade, @valor, @data, @km, @cod);
                    `;
                    const requestCarga = new Request(insertCargaQuery, err => {
                        if (err) return connection.rollbackTransaction(() => res.status(500).json({ message: `Erro ao inserir carga do lançamento: ${err.message}` }));
                        cargasCompleted++;
                        if (cargasCompleted === l.Cargas.length) {
                            connection.commitTransaction(err => {
                                if (err) return connection.rollbackTransaction(() => res.status(500).json({ message: `Erro ao commitar transação: ${err.message}` }));
                                res.status(201).json({ ...newLancamento, Cargas: l.Cargas, Calculo: calc });
                                connection.close();
                            });
                        }
                    });
                    requestCarga.addParameter('idl', TYPES.Int, newLancamentoId); requestCarga.addParameter('idc', TYPES.Int, c.ID_Carga);
                    requestCarga.addParameter('num', TYPES.NVarChar, String(c.NumeroCarga)); requestCarga.addParameter('cidade', TYPES.NVarChar, c.Cidade);
                    requestCarga.addParameter('valor', TYPES.Decimal, c.ValorCTE, { precision: 18, scale: 2 }); requestCarga.addParameter('data', TYPES.Date, c.DataCTE);
                    requestCarga.addParameter('km', TYPES.Int, c.KM); requestCarga.addParameter('cod', TYPES.NVarChar, c.COD_VEICULO);
                    connection.execSql(requestCarga);
                });
            });
            requestLancamento.addParameter('data', TYPES.Date, l.DataFrete); requestLancamento.addParameter('idv', TYPES.Int, l.ID_Veiculo);
            requestLancamento.addParameter('cidade', TYPES.NVarChar, calc.CidadeBase); requestLancamento.addParameter('km', TYPES.Int, calc.KMBase);
            requestLancamento.addParameter('vb', TYPES.Decimal, calc.ValorBase, { precision: 18, scale: 2 }); requestLancamento.addParameter('ped', TYPES.Decimal, calc.Pedagio, { precision: 18, scale: 2 });
            requestLancamento.addParameter('balsa', TYPES.Decimal, calc.Balsa, { precision: 18, scale: 2 }); requestLancamento.addParameter('amb', TYPES.Decimal, calc.Ambiental, { precision: 18, scale: 2 });
            requestLancamento.addParameter('chapa', TYPES.Decimal, calc.Chapa, { precision: 18, scale: 2 }); requestLancamento.addParameter('outras', TYPES.Decimal, calc.Outras, { precision: 18, scale: 2 });
            requestLancamento.addParameter('vt', TYPES.Decimal, calc.ValorTotal, { precision: 18, scale: 2 }); requestLancamento.addParameter('user', TYPES.NVarChar, l.Usuario);
            requestLancamento.addParameter('motivo', TYPES.NVarChar, l.Motivo);
            connection.execSql(requestLancamento);
        });
    });
});

app.put('/lancamentos/:id', async (req, res) => { // Soft delete
    const { motivo } = req.body;
    if (!motivo) return res.status(400).json({ message: "Motivo é obrigatório para exclusão." });

    const query = `UPDATE Lancamentos SET Excluido = 1, MotivoExclusao = @motivo WHERE ID_Lancamento = @id;`;
    const params = [ { name: 'id', type: TYPES.Int, value: req.params.id }, { name: 'motivo', type: TYPES.NVarChar, value: motivo } ];
    try {
        await executeQuery(configOdin, query, params);
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// PARÂMETROS - VALORES
app.get('/parametros-valores', async (req, res) => {
    try {
        const { rows } = await executeQuery(configOdin, 'SELECT * FROM ParametrosValores');
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
});
app.post('/parametros-valores', async (req, res) => {
    const p = req.body;
    const query = `INSERT INTO ParametrosValores (Cidade, TipoVeiculo, ValorBase, KM) OUTPUT INSERTED.* VALUES (@cidade, @tipo, @valor, @km);`;
    const params = [
        { name: 'cidade', type: TYPES.NVarChar, value: p.Cidade }, { name: 'tipo', type: TYPES.NVarChar, value: p.TipoVeiculo },
        { name: 'valor', type: TYPES.Decimal, value: p.ValorBase, options: { precision: 18, scale: 2 } }, { name: 'km', type: TYPES.Int, value: p.KM }
    ];
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.status(201).json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});
app.put('/parametros-valores/:id', async (req, res) => {
    const p = req.body;
    const query = `UPDATE ParametrosValores SET Cidade=@cidade, TipoVeiculo=@tipo, ValorBase=@valor, KM=@km OUTPUT INSERTED.* WHERE ID_Parametro=@id;`;
    const params = [
        { name: 'id', type: TYPES.Int, value: req.params.id }, { name: 'cidade', type: TYPES.NVarChar, value: p.Cidade },
        { name: 'tipo', type: TYPES.NVarChar, value: p.TipoVeiculo }, { name: 'valor', type: TYPES.Decimal, value: p.ValorBase, options: { precision: 18, scale: 2 } },
        { name: 'km', type: TYPES.Int, value: p.KM }
    ];
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});
app.delete('/parametros-valores/:id', async (req, res) => {
    const query = `DELETE FROM ParametrosValores WHERE ID_Parametro=@id;`;
    const params = [{ name: 'id', type: TYPES.Int, value: req.params.id }];
    try {
        await executeQuery(configOdin, query, params);
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// PARÂMETROS - TAXAS
app.get('/parametros-taxas', async (req, res) => {
    try {
        const { rows } = await executeQuery(configOdin, 'SELECT * FROM ParametrosTaxas');
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
});
app.post('/parametros-taxas', async (req, res) => {
    const p = req.body;
    const query = `INSERT INTO ParametrosTaxas (Cidade, Pedagio, Balsa, Ambiental, Chapa, Outras) OUTPUT INSERTED.* VALUES (@cidade, @ped, @balsa, @amb, @chapa, @outras);`;
    const params = [
        { name: 'cidade', type: TYPES.NVarChar, value: p.Cidade }, { name: 'ped', type: TYPES.Decimal, value: p.Pedagio, options: { precision: 18, scale: 2 } },
        { name: 'balsa', type: TYPES.Decimal, value: p.Balsa, options: { precision: 18, scale: 2 } }, { name: 'amb', type: TYPES.Decimal, value: p.Ambiental, options: { precision: 18, scale: 2 } },
        { name: 'chapa', type: TYPES.Decimal, value: p.Chapa, options: { precision: 18, scale: 2 } }, { name: 'outras', type: TYPES.Decimal, value: p.Outras, options: { precision: 18, scale: 2 } }
    ];
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.status(201).json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});
app.put('/parametros-taxas/:id', async (req, res) => {
    const p = req.body;
    const query = `UPDATE ParametrosTaxas SET Cidade=@cidade, Pedagio=@ped, Balsa=@balsa, Ambiental=@amb, Chapa=@chapa, Outras=@outras OUTPUT INSERTED.* WHERE ID_Taxa=@id;`;
    const params = [
        { name: 'id', type: TYPES.Int, value: req.params.id }, { name: 'cidade', type: TYPES.NVarChar, value: p.Cidade },
        { name: 'ped', type: TYPES.Decimal, value: p.Pedagio, options: { precision: 18, scale: 2 } }, { name: 'balsa', type: TYPES.Decimal, value: p.Balsa, options: { precision: 18, scale: 2 } },
        { name: 'amb', type: TYPES.Decimal, value: p.Ambiental, options: { precision: 18, scale: 2 } }, { name: 'chapa', type: TYPES.Decimal, value: p.Chapa, options: { precision: 18, scale: 2 } },
        { name: 'outras', type: TYPES.Decimal, value: p.Outras, options: { precision: 18, scale: 2 } }
    ];
    try {
        const { rows } = await executeQuery(configOdin, query, params);
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});
app.delete('/parametros-taxas/:id', async (req, res) => {
    const query = `DELETE FROM ParametrosTaxas WHERE ID_Taxa=@id;`;
    const params = [{ name: 'id', type: TYPES.Int, value: req.params.id }];
    try {
        await executeQuery(configOdin, query, params);
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// MOTIVOS SUBSTITUIÇÃO (Static data from API)
app.get('/motivos-substituicao', (req, res) => {
    const motivos = [
        { ID_Motivo: 1, Descricao: 'Correção de valor' },
        { ID_Motivo: 2, Descricao: 'Alteração de rota' },
        { ID_Motivo: 3, Descricao: 'Lançamento indevido' },
        { ID_Motivo: 4, Descricao: 'Outro' },
    ];
    res.json(motivos);
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor da API rodando em http://localhost:${port}`);
});