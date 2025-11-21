

// Carrega as variáveis de ambiente
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Connection, Request, TYPES } = require('tedious');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- Swagger Documentation ---
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');

// --- Configurações de Segurança ---
const JWT_SECRET = process.env.JWT_SECRET || 'fretes-secret-key-change-in-prod';
const SALT_ROUNDS = 10;

// --- Configurações de BD ---
const configOdin = {
  server: process.env.DB_SERVER_ODIN,
  authentication: {
    type: 'default',
    options: { userName: process.env.DB_USER_ODIN, password: process.env.DB_PASSWORD_ODIN },
  },
  options: { encrypt: true, database: process.env.DB_DATABASE_ODIN, rowCollectionOnRequestCompletion: true, trustServerCertificate: true },
};

const configErp = {
  server: process.env.DB_SERVER_ERP,
  authentication: {
    type: 'default',
    options: { userName: process.env.DB_USER_ERP, password: process.env.DB_PASSWORD_ERP },
  },
  options: { encrypt: true, database: process.env.DB_DATABASE_ERP, rowCollectionOnRequestCompletion: true, trustServerCertificate: true },
};

function executeQuery(config, query, params = []) {
  return new Promise((resolve, reject) => {
    const connection = new Connection(config);
    connection.on('connect', (err) => {
      if (err) return reject(new Error(`Falha na conexão: ${err.message}`));
      const request = new Request(query, (err, rowCount, rows) => {
        connection.close();
        if (err) return reject(new Error(`Erro SQL: ${err.message}`));
        const result = rows.map(row => {
          const obj = {};
          row.forEach(col => { obj[col.metadata.colName] = col.value; });
          return obj;
        });
        resolve({ rows: result, rowCount });
      });
      params.forEach(p => { request.addParameter(p.name, p.type, p.value, p.options); });
      connection.execSql(request);
    });
    connection.connect();
  });
}

// --- Função de Normalização de Chaves (Resolver problemas de Case Sensitivity do Banco) ---
const normalizeKeys = (obj) => {
    const newObj = {};
    Object.keys(obj).forEach(key => {
        const k = key.toUpperCase();
        // Mapeamento Veículos
        if (k === 'ID_VEICULO') newObj['ID_Veiculo'] = obj[key];
        else if (k === 'COD_VEICULO') newObj['COD_Veiculo'] = obj[key];
        else if (k === 'PLACA') newObj['Placa'] = obj[key];
        else if (k === 'TIPOVEICULO') newObj['TipoVeiculo'] = obj[key];
        else if (k === 'MOTORISTA') newObj['Motorista'] = obj[key];
        else if (k === 'CAPACIDADEKG') newObj['CapacidadeKG'] = obj[key];
        else if (k === 'ATIVO') newObj['Ativo'] = obj[key];
        else if (k === 'ORIGEM') newObj['Origem'] = obj[key];
        else if (k === 'USUARIOCRIACAO') newObj['UsuarioCriacao'] = obj[key];
        else if (k === 'USUARIOALTERACAO') newObj['UsuarioAlteracao'] = obj[key];
        
        // Mapeamento Cargas
        else if (k === 'ID_CARGA') newObj['ID_Carga'] = obj[key];
        else if (k === 'NUMEROCARGA') newObj['NumeroCarga'] = obj[key];
        else if (k === 'CIDADE') newObj['Cidade'] = obj[key];
        else if (k === 'VALORCTE') newObj['ValorCTE'] = obj[key];
        else if (k === 'DATACTE') newObj['DataCTE'] = obj[key];
        else if (k === 'KM') newObj['KM'] = obj[key];
        else if (k === 'EXCLUIDO') newObj['Excluido'] = obj[key];
        else if (k === 'MOTIVOEXCLUSAO') newObj['MotivoExclusao'] = obj[key];
        else if (k === 'MOTIVOALTERACAO') newObj['MotivoAlteracao'] = obj[key];
        
        // Fallback: mantem original se não encontrar mapeamento
        else newObj[key] = obj[key];
    });
    return newObj;
};

// --- Middleware de Autenticação ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido.' });
        req.user = user;
        next();
    });
};

const app = express();

// CORS Explícito para garantir que o Header Authorization passe
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- ROTA DE DOCUMENTAÇÃO SWAGGER ---
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const port = process.env.API_PORT || 3000;

// Inicializa Admin se não existir
const initAdminUser = async () => {
    try {
        // Verifica especificamente se o usuário 'admin' existe
        const { rows } = await executeQuery(configOdin, "SELECT ID_Usuario FROM Usuarios WHERE Usuario = 'admin'");
        if (rows.length === 0) {
            console.log('Usuário admin não encontrado. Criando...');
            const hashedPassword = await bcrypt.hash('admin', SALT_ROUNDS);
            const query = `INSERT INTO Usuarios (Nome, Usuario, SenhaHash, Perfil, Ativo) VALUES ('Administrador', 'admin', @pass, 'Admin', 1)`;
            await executeQuery(configOdin, query, [{ name: 'pass', type: TYPES.NVarChar, value: hashedPassword }]);
            console.log('Usuário Admin padrão criado com sucesso.');
        }
    } catch (e) { console.error('Erro init admin:', e.message); }
};
initAdminUser();

// --- ROTAS PÚBLICAS ---
app.get('/', (req, res) => res.send('API Fretes OK. Acesse /docs para documentação.'));

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const { rows } = await executeQuery(configOdin, "SELECT * FROM Usuarios WHERE Usuario = @user AND Ativo = 1", [{ name: 'user', type: TYPES.NVarChar, value: usuario }]);
        if (rows.length === 0) return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
        
        const user = rows[0];
        const validPassword = await bcrypt.compare(senha, user.SenhaHash);
        if (!validPassword) return res.status(401).json({ message: 'Usuário ou senha incorretos.' });

        const token = jwt.sign({ id: user.ID_Usuario, usuario: user.Usuario, nome: user.Nome, perfil: user.Perfil }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ user: { ID_Usuario: user.ID_Usuario, Nome: user.Nome, Usuario: user.Usuario, Perfil: user.Perfil, Ativo: user.Ativo }, token });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- ROTAS PROTEGIDAS ---

// USUÁRIOS
app.get('/usuarios', authenticateToken, async (req, res) => {
    if (req.user.perfil !== 'Admin') return res.status(403).json({ message: 'Acesso negado.' });
    try {
        const { rows } = await executeQuery(configOdin, 'SELECT ID_Usuario, Nome, Usuario, Perfil, Ativo, DataCriacao FROM Usuarios ORDER BY Nome');
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/usuarios', authenticateToken, async (req, res) => {
    if (req.user.perfil !== 'Admin') return res.status(403).json({ message: 'Acesso negado.' });
    const { Nome, Usuario, Senha, Perfil } = req.body;
    if (!Senha) return res.status(400).json({ message: 'Senha obrigatória.' });
    try {
        const hashedPassword = await bcrypt.hash(Senha, SALT_ROUNDS);
        const query = `INSERT INTO Usuarios (Nome, Usuario, SenhaHash, Perfil, Ativo) OUTPUT INSERTED.ID_Usuario, INSERTED.Nome, INSERTED.Usuario, INSERTED.Perfil, INSERTED.Ativo VALUES (@nome, @user, @pass, @perfil, 1)`;
        const params = [
            { name: 'nome', type: TYPES.NVarChar, value: Nome }, { name: 'user', type: TYPES.NVarChar, value: Usuario },
            { name: 'pass', type: TYPES.NVarChar, value: hashedPassword }, { name: 'perfil', type: TYPES.NVarChar, value: Perfil }
        ];
        const { rows } = await executeQuery(configOdin, query, params);
        res.status(201).json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/usuarios/:id', authenticateToken, async (req, res) => {
    if (req.user.perfil !== 'Admin') return res.status(403).json({ message: 'Acesso negado.' });
    const { Nome, Perfil, Ativo, Senha } = req.body;
    try {
        let query = `UPDATE Usuarios SET Nome=@nome, Perfil=@perfil, Ativo=@ativo`;
        const params = [
            { name: 'id', type: TYPES.Int, value: req.params.id }, { name: 'nome', type: TYPES.NVarChar, value: Nome },
            { name: 'perfil', type: TYPES.NVarChar, value: Perfil }, { name: 'ativo', type: TYPES.Bit, value: Ativo }
        ];
        if (Senha) {
            const hashedPassword = await bcrypt.hash(Senha, SALT_ROUNDS);
            query += `, SenhaHash=@pass`;
            params.push({ name: 'pass', type: TYPES.NVarChar, value: hashedPassword });
        }
        query += ` OUTPUT INSERTED.ID_Usuario, INSERTED.Nome, INSERTED.Usuario, INSERTED.Perfil, INSERTED.Ativo WHERE ID_Usuario=@id`;
        const { rows } = await executeQuery(configOdin, query, params);
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// VEÍCULOS
app.get('/veiculos', authenticateToken, async (req, res) => {
    try { 
        // USO DE 'AS' (ALIASES) PARA FORÇAR O NOME CORRETO DAS COLUNAS JSON
        const query = 'SELECT ID_Veiculo AS ID_Veiculo, COD_Veiculo AS COD_Veiculo, Placa AS Placa, TipoVeiculo AS TipoVeiculo, Motorista AS Motorista, CapacidadeKG AS CapacidadeKG, Ativo AS Ativo, Origem AS Origem, UsuarioCriacao AS UsuarioCriacao, UsuarioAlteracao AS UsuarioAlteracao FROM Veiculos ORDER BY Ativo DESC, Placa ASC';
        console.log('[DEBUG API] Solicitando Veículos...');
        const { rows } = await executeQuery(configOdin, query); 
        console.log(`[DEBUG API] Veículos encontrados: ${rows.length}`);
        
        // Mantemos normalizeKeys como backup, mas o alias SQL é mais forte
        const normalizedRows = rows.map(normalizeKeys);
        res.json(normalizedRows); 
    } catch (error) { 
        console.error('[DEBUG API] Erro ao buscar veículos:', error);
        res.status(500).json({ message: error.message }); 
    }
});
app.post('/veiculos', authenticateToken, async (req, res) => {
    const v = req.body;
    const u = req.user;
    const query = `INSERT INTO Veiculos (COD_Veiculo, Placa, TipoVeiculo, Motorista, CapacidadeKG, Ativo, Origem, UsuarioCriacao) OUTPUT INSERTED.* VALUES (@cod, @placa, @tipo, @mot, @cap, @ativo, @origem, @user)`;
    const params = [
        {name:'cod',type:TYPES.NVarChar,value:v.COD_Veiculo}, {name:'placa',type:TYPES.NVarChar,value:v.Placa}, 
        {name:'tipo',type:TYPES.NVarChar,value:v.TipoVeiculo}, {name:'mot',type:TYPES.NVarChar,value:v.Motorista}, 
        {name:'cap',type:TYPES.Int,value:v.CapacidadeKG}, {name:'ativo',type:TYPES.Bit,value:v.Ativo}, 
        {name:'origem',type:TYPES.NVarChar,value:v.Origem||'Manual'}, {name:'user',type:TYPES.NVarChar,value:u.usuario}
    ];
    try { const { rows } = await executeQuery(configOdin, query, params); res.status(201).json(normalizeKeys(rows[0])); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/veiculos/:id', authenticateToken, async (req, res) => {
    const v = req.body;
    const u = req.user;
    const query = `UPDATE Veiculos SET COD_Veiculo=@cod, Placa=@placa, TipoVeiculo=@tipo, Motorista=@mot, CapacidadeKG=@cap, Ativo=@ativo, UsuarioAlteracao=@user OUTPUT INSERTED.* WHERE ID_Veiculo=@id`;
    const params = [
        {name:'id',type:TYPES.Int,value:req.params.id}, {name:'cod',type:TYPES.NVarChar,value:v.COD_Veiculo}, 
        {name:'placa',type:TYPES.NVarChar,value:v.Placa}, {name:'tipo',type:TYPES.NVarChar,value:v.TipoVeiculo}, 
        {name:'mot',type:TYPES.NVarChar,value:v.Motorista}, {name:'cap',type:TYPES.Int,value:v.CapacidadeKG}, 
        {name:'ativo',type:TYPES.Bit,value:v.Ativo}, {name:'user',type:TYPES.NVarChar,value:u.usuario}
    ];
    try { const { rows } = await executeQuery(configOdin, query, params); res.json(normalizeKeys(rows[0])); } catch (e) { res.status(500).json({ message: e.message }); }
});

// VEÍCULOS ERP
app.get('/veiculos-erp/check', authenticateToken, async (req, res) => {
    try {
        const erpQ = `SELECT v.codvec AS COD_VEICULO, v.numplcvec AS PLACA, RTRIM(m.desmdlvec) AS TIPO, RTRIM(c.nomepg) AS MOTORISTA, v.valcdepsovec AS CAPACIDADE_KG, CASE WHEN v.INDSTUVEC='1' THEN 'Ativo' ELSE 'Inativo' END AS STATUS_ATIVO FROM flexx10071188.dbo.ibetvec v WITH(NOLOCK) LEFT JOIN flexx10071188.dbo.IBETTPLPDRVEC t WITH(NOLOCK) ON v.codvec=t.codvec LEFT JOIN flexx10071188.dbo.IBETCPLEPG c WITH(NOLOCK) ON t.codmtcepg=c.codmtcepg LEFT JOIN flexx10071188.dbo.IBETDOMMDLVEC m WITH(NOLOCK) ON v.tpomdlvec=m.tpomdlvec WHERE c.tpoepg='m'`;
        const { rows: erpV } = await executeQuery(configErp, erpQ);
        const { rows: localV } = await executeQuery(configOdin, 'SELECT * FROM Veiculos');
        const localMap = new Map(localV.map(v => [v.COD_Veiculo.trim().toUpperCase(), v]));
        const newV = [], conflicts = [];
        erpV.forEach(e => {
            const cod = String(e.COD_VEICULO).trim().toUpperCase();
            const norm = { COD_Veiculo: cod, Placa: String(e.PLACA||'').trim().toUpperCase(), TipoVeiculo: String(e.TIPO||'PADRÃO').trim(), Motorista: String(e.MOTORISTA||'N/A').trim(), CapacidadeKG: Number(e.CAPACIDADE_KG)||0, Ativo: e.STATUS_ATIVO==='Ativo', Origem:'ERP' };
            if(localMap.has(cod)) conflicts.push({local: normalizeKeys(localMap.get(cod)), erp: norm, action: 'skip'}); else newV.push(norm);
        });
        res.json({ newVehicles: newV, conflicts, message: 'Check OK' });
    } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/veiculos-erp/sync', authenticateToken, async (req, res) => {
    const { newVehicles, vehiclesToUpdate } = req.body;
    const user = req.user;
    const conn = new Connection(configOdin);
    conn.connect(err => {
        if (err) return res.status(500).json({ message: err.message });
        conn.beginTransaction(async err => {
            try {
                for(const v of newVehicles) {
                    const q = `INSERT INTO Veiculos (COD_Veiculo, Placa, TipoVeiculo, Motorista, CapacidadeKG, Ativo, Origem, UsuarioCriacao) VALUES (@c, @p, @t, @m, @k, @a, 'ERP', @u)`;
                    await new Promise((res, rej) => { const r=new Request(q, e=>e?rej(e):res()); r.addParameter('c',TYPES.NVarChar,v.COD_Veiculo); r.addParameter('p',TYPES.NVarChar,v.Placa); r.addParameter('t',TYPES.NVarChar,v.TipoVeiculo); r.addParameter('m',TYPES.NVarChar,v.Motorista); r.addParameter('k',TYPES.Int,v.CapacidadeKG); r.addParameter('a',TYPES.Bit,v.Ativo); r.addParameter('u',TYPES.NVarChar,user.usuario); conn.execSql(r); });
                }
                for(const v of vehiclesToUpdate) {
                    const q = `UPDATE Veiculos SET Placa=@p, TipoVeiculo=@t, Motorista=@m, CapacidadeKG=@k, Ativo=@a, UsuarioAlteracao=@u WHERE COD_Veiculo=@c`;
                    await new Promise((res, rej) => { const r=new Request(q, e=>e?rej(e):res()); r.addParameter('p',TYPES.NVarChar,v.Placa); r.addParameter('t',TYPES.NVarChar,v.TipoVeiculo); r.addParameter('m',TYPES.NVarChar,v.Motorista); r.addParameter('k',TYPES.Int,v.CapacidadeKG); r.addParameter('a',TYPES.Bit,v.Ativo); r.addParameter('c',TYPES.NVarChar,v.COD_Veiculo); r.addParameter('u',TYPES.NVarChar,user.usuario); conn.execSql(r); });
                }
                conn.commitTransaction(() => { res.json({ message: 'Sync OK', count: newVehicles.length + vehiclesToUpdate.length }); conn.close(); });
            } catch(e) { conn.rollbackTransaction(() => { res.status(500).json({ message: e.message }); conn.close(); }); }
        });
    });
});

// CARGAS
app.get('/cargas-manuais', authenticateToken, async (req, res) => {
    try { 
        // USO DE 'AS' (ALIASES) PARA FORÇAR O NOME CORRETO DAS COLUNAS
        const query = 'SELECT ID_Carga AS ID_Carga, NumeroCarga AS NumeroCarga, Cidade AS Cidade, ValorCTE AS ValorCTE, DataCTE AS DataCTE, KM AS KM, COD_VEICULO AS COD_VEICULO, Origem AS Origem, Excluido AS Excluido, MotivoExclusao AS MotivoExclusao, MotivoAlteracao AS MotivoAlteracao, UsuarioCriacao AS UsuarioCriacao, UsuarioAlteracao AS UsuarioAlteracao FROM CargasManuais ORDER BY DataCTE DESC';
        const { rows } = await executeQuery(configOdin, query); 
        res.json(rows.map(normalizeKeys)); 
    } catch (e) { res.status(500).json({ message: e.message }); }
});
app.post('/cargas-manuais', authenticateToken, async (req, res) => {
    const c = req.body;
    const u = req.user;
    const q = `INSERT INTO CargasManuais (NumeroCarga, Cidade, ValorCTE, DataCTE, KM, COD_VEICULO, Origem, UsuarioCriacao) OUTPUT INSERTED.* VALUES (@n, @c, @v, @d, @k, @cv, @o, @u)`;
    const p = [
        {name:'n',type:TYPES.NVarChar,value:String(c.NumeroCarga)}, {name:'c',type:TYPES.NVarChar,value:c.Cidade}, 
        {name:'v',type:TYPES.Decimal,value:c.ValorCTE,options:{precision:18,scale:2}}, {name:'d',type:TYPES.Date,value:c.DataCTE}, 
        {name:'k',type:TYPES.Int,value:c.KM}, {name:'cv',type:TYPES.NVarChar,value:c.COD_Veiculo||c.COD_VEICULO}, 
        {name:'o',type:TYPES.NVarChar,value:c.Origem||'Manual'}, {name:'u',type:TYPES.NVarChar,value:u.usuario}
    ];
    try { const { rows } = await executeQuery(configOdin, q, p); res.status(201).json(normalizeKeys(rows[0])); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/cargas-manuais/:id', authenticateToken, async (req, res) => {
    const c = req.body;
    const user = req.user;
    let q, p;
    if(c.Excluido) {
        const m = `${c.MotivoExclusao} (por ${user.usuario})`;
        q = `UPDATE CargasManuais SET Excluido=1, MotivoExclusao=@m, UsuarioAlteracao=@u OUTPUT INSERTED.* WHERE ID_Carga=@id`;
        p = [{name:'id',type:TYPES.Int,value:req.params.id}, {name:'m',type:TYPES.NVarChar,value:m}, {name:'u',type:TYPES.NVarChar,value:user.usuario}];
    } else {
        const m = c.MotivoAlteracao ? `${c.MotivoAlteracao} (por ${user.usuario})` : `Edição (por ${user.usuario})`;
        q = `UPDATE CargasManuais SET NumeroCarga=@n, Cidade=@c, ValorCTE=@v, DataCTE=@d, KM=@k, COD_VEICULO=@cv, MotivoAlteracao=@m, UsuarioAlteracao=@u OUTPUT INSERTED.* WHERE ID_Carga=@id`;
        p = [
            {name:'id',type:TYPES.Int,value:req.params.id}, {name:'n',type:TYPES.NVarChar,value:String(c.NumeroCarga)}, 
            {name:'c',type:TYPES.NVarChar,value:c.Cidade}, {name:'v',type:TYPES.Decimal,value:c.ValorCTE,options:{precision:18,scale:2}}, 
            {name:'d',type:TYPES.Date,value:c.DataCTE}, {name:'k',type:TYPES.Int,value:c.KM}, 
            {name:'cv',type:TYPES.NVarChar,value:c.COD_Veiculo||c.COD_VEICULO}, {name:'m',type:TYPES.NVarChar,value:m},
            {name:'u',type:TYPES.NVarChar,value:user.usuario}
        ];
    }
    try { const { rows } = await executeQuery(configOdin, q, p); res.json(normalizeKeys(rows[0])); } catch (e) { res.status(500).json({ message: e.message }); }
});

// CARGAS ERP
app.post('/cargas-erp/check', authenticateToken, async (req, res) => {
    const { sIni, sFim } = req.body;
    try {
        const q = `SELECT PDD.NUMSEQETGPDD AS CARGA, PDD.CODVEC AS COD_VEICULO, LVR.DATEMSNF_LVRSVC AS [DATA CTE], LVR.VALSVCTOTLVRSVC AS [VALOR CTE], RTRIM(CDD.DESCDD) AS CIDADE FROM Flexx10071188.dbo.IRFTLVRSVC LVR (NOLOCK) LEFT JOIN Flexx10071188.dbo.IBETPDDSVCNF_ PDD (NOLOCK) ON PDD.CODEMP = LVR.CODEMP AND PDD.NUMDOCTPTPDD = LVR.NUMNF_LVRSVC AND PDD.INDSERDOCTPTPDD = LVR.CODSERNF_LVRSVC LEFT JOIN Flexx10071188.dbo.IBETCET CET (NOLOCK) ON LVR.CODEMP = CET.CODEMP AND LVR.CODCET = CET.CODCET LEFT JOIN Flexx10071188.dbo.IBETEDRCET EDR (NOLOCK) ON CET.CODEMP = EDR.CODEMP AND CET.CODCET = EDR.CODCET AND EDR.CODTPOEDR = 1 LEFT JOIN Flexx10071188.dbo.IBETCDD CDD (NOLOCK) ON EDR.CODEMP = CDD.CODEMP AND EDR.CODPAS = CDD.CODPAS AND EDR.CODUF_ = CDD.CODUF_ AND EDR.CODCDD = CDD.CODCDD WHERE LVR.DATEMSNF_LVRSVC BETWEEN @i AND @f GROUP BY PDD.NUMSEQETGPDD, PDD.CODVEC, LVR.DATEMSNF_LVRSVC, LVR.VALSVCTOTLVRSVC, CDD.DESCDD`;
        const { rows: erpRows } = await executeQuery(configErp, q, [{name:'i',type:TYPES.Date,value:sIni}, {name:'f',type:TYPES.Date,value:sFim}]);
        if (erpRows.length === 0) return res.json({ message: 'Nada novo.', newCargas: [], deletedCargas: [], missingVehicles: [] });
        
        const agg = new Map();
        erpRows.forEach(r => {
            // CORREÇÃO CRÍTICA: Ignorar registros sem veículo definido (NULL)
            if (!r.COD_VEICULO) return;
            const codRaw = String(r.COD_VEICULO).trim().toUpperCase();
            if (codRaw === 'NULL' || codRaw === '') return;

            const key = `${r.CARGA}|${r.CIDADE}`;
            const obj = { NumeroCarga: r.CARGA, COD_Veiculo: codRaw, DataCTE: r['DATA CTE'], ValorCTE: r['VALOR CTE'], Cidade: r.CIDADE };
            if (agg.has(key)) agg.get(key).ValorCTE += obj.ValorCTE; else agg.set(key, obj);
        });
        
        const { rows: localC } = await executeQuery(configOdin, "SELECT NumeroCarga, Cidade, Excluido, MotivoExclusao FROM CargasManuais WHERE Origem='ERP'");
        const localMap = new Map(localC.map(c => [`${c.NumeroCarga}|${c.Cidade}`, normalizeKeys(c)]));
        const { rows: vs } = await executeQuery(configOdin, 'SELECT COD_Veiculo FROM Veiculos');
        const vSet = new Set(vs.map(v => v.COD_Veiculo.trim().toUpperCase()));
        
        const newC = [], delC = [], missingV = new Set();
        for (const c of agg.values()) {
            // Proteção adicional para o loop de verificação
            if (!c.COD_Veiculo || c.COD_Veiculo === 'NULL') continue;

            if (!vSet.has(c.COD_Veiculo)) { missingV.add(c.COD_Veiculo); continue; }
            
            const key = `${c.NumeroCarga}|${c.Cidade}`;
            if (localMap.has(key)) {
                const l = localMap.get(key);
                if (l.Excluido) delC.push({ erp: c, local: l, motivoExclusao: l.MotivoExclusao, selected: false });
            } else newC.push({ ...c, KM: 0 }); 
        }
        res.json({ newCargas: newC, deletedCargas: delC, missingVehicles: Array.from(missingV), message: 'Check OK' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/cargas-erp/sync', authenticateToken, async (req, res) => {
    const { newCargas, cargasToReactivate } = req.body;
    const user = req.user;
    const conn = new Connection(configOdin);
    conn.connect(err => {
        if (err) return res.status(500).json({ message: err.message });
        conn.beginTransaction(async err => {
            try {
                const BATCH = 200;
                for (let i = 0; i < newCargas.length; i += BATCH) {
                    const chunk = newCargas.slice(i, i + BATCH);
                    let q = "INSERT INTO CargasManuais (NumeroCarga, Cidade, ValorCTE, DataCTE, KM, COD_VEICULO, Origem, UsuarioCriacao) VALUES ";
                    const p = [];
                    chunk.forEach((c, idx) => {
                        q += (idx > 0 ? ", " : "") + `(@n${idx}, @c${idx}, @v${idx}, @d${idx}, @k${idx}, @cv${idx}, 'ERP', @u${idx})`;
                        p.push(
                            {name:`n${idx}`,type:TYPES.NVarChar,value:String(c.NumeroCarga)},{name:`c${idx}`,type:TYPES.NVarChar,value:c.Cidade},
                            {name:`v${idx}`,type:TYPES.Decimal,value:c.ValorCTE,options:{precision:18,scale:2}},{name:`d${idx}`,type:TYPES.Date,value:c.DataCTE},
                            {name:`k${idx}`,type:TYPES.Int,value:c.KM},{name:`cv${idx}`,type:TYPES.NVarChar,value:c.COD_Veiculo||c.COD_VEICULO},
                            {name:`u${idx}`,type:TYPES.NVarChar,value:user.usuario}
                        );
                    });
                    await new Promise((res, rej) => { const r = new Request(q+";", e => e ? rej(e) : res()); p.forEach(pp => r.addParameter(pp.name, pp.type, pp.value, pp.options)); conn.execSql(r); });
                }
                for (const c of cargasToReactivate) {
                    const m = `Reativado ERP (por ${user.usuario})`;
                    const q = `UPDATE CargasManuais SET Excluido=0, MotivoExclusao=NULL, ValorCTE=@v, DataCTE=@d, MotivoAlteracao=@m, UsuarioAlteracao=@u WHERE NumeroCarga=@n AND Cidade=@c AND Origem='ERP'`;
                    await new Promise((res, rej) => { 
                        const r=new Request(q, e=>e?rej(e):res()); 
                        r.addParameter('v',TYPES.Decimal,c.ValorCTE,{precision:18,scale:2}); r.addParameter('d',TYPES.Date,c.DataCTE); 
                        r.addParameter('m',TYPES.NVarChar,m); r.addParameter('n',TYPES.NVarChar,String(c.NumeroCarga)); 
                        r.addParameter('c',TYPES.NVarChar,c.Cidade); r.addParameter('u',TYPES.NVarChar,user.usuario);
                        conn.execSql(r); 
                    });
                }
                conn.commitTransaction(() => { res.json({ message: 'Sync OK', count: newCargas.length + cargasToReactivate.length }); conn.close(); });
            } catch (e) { conn.rollbackTransaction(() => { res.status(500).json({ message: e.message }); conn.close(); }); }
        });
    });
});

// LANÇAMENTOS
app.get('/lancamentos', authenticateToken, async (req, res) => {
    try {
        const { rows: ls } = await executeQuery(configOdin, 'SELECT * FROM Lancamentos ORDER BY DataCriacao DESC');
        for (const l of ls) {
            const { rows: cs } = await executeQuery(configOdin, 'SELECT * FROM Lancamento_Cargas WHERE ID_Lancamento=@id', [{name:'id',type:TYPES.Int,value:l.ID_Lancamento}]);
            l.Cargas = cs.map(c => ({ ID_Carga: c.ID_Carga_Origem, NumeroCarga: c.NumeroCarga, Cidade: c.Cidade, ValorCTE: c.ValorCTE, DataCTE: c.DataCTE.toISOString().split('T')[0], KM: c.KM, COD_Veiculo: c.COD_VEICULO }));
            l.Calculo = { CidadeBase: l.CidadeBase, KMBase: l.KMBase, ValorBase: l.ValorBase, Pedagio: l.Pedagio, Balsa: l.Balsa, Ambiental: l.Ambiental, Chapa: l.Chapa, Outras: l.Outras, ValorTotal: l.ValorTotal };
        }
        res.json(ls); // Lancamentos geralmente retornam camelCase do driver, se der problema, aplicar normalize tb
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/lancamentos', authenticateToken, (req, res) => {
    const l = req.body;
    const calc = l.Calculo;
    const user = req.user;
    const conn = new Connection(configOdin);
    conn.connect(err => {
        if (err) return res.status(500).json({ message: err.message });
        conn.beginTransaction(async err => {
            try {
                if (l.Cargas.length > 0) {
                    const m = l.Motivo ? `Substituído: ${l.Motivo} (por ${user.usuario})` : `Substituído por novo (por ${user.usuario})`;
                    for (const c of l.Cargas) {
                        await new Promise((res, rej) => { 
                            const r = new Request(`UPDATE L SET L.Excluido=1, L.MotivoExclusao=@m, L.UsuarioAlteracao=@u FROM Lancamentos L INNER JOIN Lancamento_Cargas LC ON L.ID_Lancamento=LC.ID_Lancamento WHERE LC.ID_Carga_Origem=@idc AND L.Excluido=0`, e => e?rej(e):res()); 
                            r.addParameter('idc',TYPES.Int,c.ID_Carga); r.addParameter('m',TYPES.NVarChar,m); r.addParameter('u',TYPES.NVarChar,user.usuario);
                            conn.execSql(r); 
                        });
                    }
                }
                let newId;
                await new Promise((res, rej) => {
                    const q = `INSERT INTO Lancamentos (DataFrete, ID_Veiculo, CidadeBase, KMBase, ValorBase, Pedagio, Balsa, Ambiental, Chapa, Outras, ValorTotal, Usuario, Motivo) OUTPUT INSERTED.ID_Lancamento VALUES (@d, @iv, @cb, @kb, @vb, @p, @b, @a, @c, @o, @vt, @u, @m)`;
                    const r = new Request(q, (e, rc, rw) => { if(e) return rej(e); newId = rw[0][0].value; res(); });
                    r.addParameter('d',TYPES.Date,l.DataFrete); r.addParameter('iv',TYPES.Int,l.ID_Veiculo); r.addParameter('cb',TYPES.NVarChar,calc.CidadeBase); r.addParameter('kb',TYPES.Int,calc.KMBase);
                    r.addParameter('vb',TYPES.Decimal,calc.ValorBase,{precision:18,scale:2}); r.addParameter('p',TYPES.Decimal,calc.Pedagio,{precision:18,scale:2}); r.addParameter('b',TYPES.Decimal,calc.Balsa,{precision:18,scale:2});
                    r.addParameter('a',TYPES.Decimal,calc.Ambiental,{precision:18,scale:2}); r.addParameter('c',TYPES.Decimal,calc.Chapa,{precision:18,scale:2}); r.addParameter('o',TYPES.Decimal,calc.Outras,{precision:18,scale:2});
                    r.addParameter('vt',TYPES.Decimal,calc.ValorTotal,{precision:18,scale:2}); r.addParameter('u',TYPES.NVarChar,user.usuario); r.addParameter('m',TYPES.NVarChar,l.Motivo);
                    conn.execSql(r);
                });
                for (const c of l.Cargas) {
                     await new Promise((res, rej) => {
                         const q = `INSERT INTO Lancamento_Cargas (ID_Lancamento, ID_Carga_Origem, NumeroCarga, Cidade, ValorCTE, DataCTE, KM, COD_VEICULO) VALUES (@idl, @idc, @n, @ci, @v, @d, @k, @cv)`;
                         const r = new Request(q, e => e?rej(e):res());
                         r.addParameter('idl',TYPES.Int,newId); r.addParameter('idc',TYPES.Int,c.ID_Carga); r.addParameter('n',TYPES.NVarChar,String(c.NumeroCarga)); r.addParameter('ci',TYPES.NVarChar,c.Cidade);
                         r.addParameter('v',TYPES.Decimal,c.ValorCTE,{precision:18,scale:2}); r.addParameter('d',TYPES.Date,c.DataCTE); r.addParameter('k',TYPES.Int,c.KM); r.addParameter('cv',TYPES.NVarChar,c.COD_Veiculo||c.COD_VEICULO);
                         conn.execSql(r);
                     });
                }
                conn.commitTransaction(() => { res.status(201).json({ ...l, ID_Lancamento: newId }); conn.close(); });
            } catch (e) { conn.rollbackTransaction(() => { res.status(500).json({ message: e.message }); conn.close(); }); }
        });
    });
});

app.put('/lancamentos/:id', authenticateToken, async (req, res) => {
    const m = `${req.body.motivo} (por ${req.user.usuario})`;
    const u = req.user.usuario;
    try { 
        await executeQuery(configOdin, `UPDATE Lancamentos SET Excluido=1, MotivoExclusao=@m, UsuarioAlteracao=@u WHERE ID_Lancamento=@id`, [
            {name:'id',type:TYPES.Int,value:req.params.id}, 
            {name:'m',type:TYPES.NVarChar,value:m},
            {name:'u',type:TYPES.NVarChar,value:u}
        ]); 
        res.status(204).send(); 
    } catch(e) { res.status(500).json({message:e.message}); }
});

// PARAMS (VALORES & TAXAS)
app.get('/parametros-valores', authenticateToken, async (req, res) => { try{res.json((await executeQuery(configOdin,'SELECT * FROM ParametrosValores WHERE Excluido=0')).rows)}catch(e){res.status(500).json({message:e.message})} });

app.post('/parametros-valores', authenticateToken, async (req, res) => { 
    const p=req.body; const u=req.user;
    try{res.status(201).json((await executeQuery(configOdin,`INSERT INTO ParametrosValores (Cidade, TipoVeiculo, ValorBase, KM, UsuarioCriacao) OUTPUT INSERTED.* VALUES (@c, @t, @v, @k, @u)`,[
        {name:'c',type:TYPES.NVarChar,value:p.Cidade},{name:'t',type:TYPES.NVarChar,value:p.TipoVeiculo},
        {name:'v',type:TYPES.Decimal,value:p.ValorBase,options:{precision:18,scale:2}},{name:'k',type:TYPES.Int,value:p.KM},
        {name:'u',type:TYPES.NVarChar,value:u.usuario}
    ])).rows[0])}catch(e){res.status(500).json({message:e.message})} 
});

app.put('/parametros-valores/:id', authenticateToken, async (req, res) => { 
    const p=req.body; const u=req.user; let q,params;
    if(p.Excluido) { 
        const m=`${p.MotivoExclusao} (por ${u.usuario})`; 
        q=`UPDATE ParametrosValores SET Excluido=1, MotivoExclusao=@m, UsuarioAlteracao=@u OUTPUT INSERTED.* WHERE ID_Parametro=@id`; 
        params=[{name:'id',type:TYPES.Int,value:req.params.id},{name:'m',type:TYPES.NVarChar,value:m},{name:'u',type:TYPES.NVarChar,value:u.usuario}]; 
    } else { 
        const m=p.MotivoAlteracao?`${p.MotivoAlteracao} (por ${u.usuario})`:`Edição (por ${u.usuario})`; 
        q=`UPDATE ParametrosValores SET Cidade=@c, TipoVeiculo=@t, ValorBase=@v, KM=@k, MotivoAlteracao=@m, UsuarioAlteracao=@u OUTPUT INSERTED.* WHERE ID_Parametro=@id`; 
        params=[
            {name:'id',type:TYPES.Int,value:req.params.id},{name:'c',type:TYPES.NVarChar,value:p.Cidade},
            {name:'t',type:TYPES.NVarChar,value:p.TipoVeiculo},{name:'v',type:TYPES.Decimal,value:p.ValorBase,options:{precision:18,scale:2}},
            {name:'k',type:TYPES.Int,value:p.KM},{name:'m',type:TYPES.NVarChar,value:m},
            {name:'u',type:TYPES.NVarChar,value:u.usuario}
        ]; 
    }
    try{res.json((await executeQuery(configOdin,q,params)).rows[0])}catch(e){res.status(500).json({message:e.message})} 
});

app.get('/parametros-taxas', authenticateToken, async (req, res) => { try{res.json((await executeQuery(configOdin,'SELECT * FROM ParametrosTaxas WHERE Excluido=0')).rows)}catch(e){res.status(500).json({message:e.message})} });

app.post('/parametros-taxas', authenticateToken, async (req, res) => { 
    const p=req.body; const u=req.user;
    try{res.status(201).json((await executeQuery(configOdin,`INSERT INTO ParametrosTaxas (Cidade, Pedagio, Balsa, Ambiental, Chapa, Outras, UsuarioCriacao) OUTPUT INSERTED.* VALUES (@c,@p,@b,@a,@ch,@o,@u)`,[
        {name:'c',type:TYPES.NVarChar,value:p.Cidade},{name:'p',type:TYPES.Decimal,value:p.Pedagio,options:{precision:18,scale:2}},
        {name:'b',type:TYPES.Decimal,value:p.Balsa,options:{precision:18,scale:2}},{name:'a',type:TYPES.Decimal,value:p.Ambiental,options:{precision:18,scale:2}},
        {name:'ch',type:TYPES.Decimal,value:p.Chapa,options:{precision:18,scale:2}},{name:'o',type:TYPES.Decimal,value:p.Outras,options:{precision:18,scale:2}},
        {name:'u',type:TYPES.NVarChar,value:u.usuario}
    ])).rows[0])}catch(e){res.status(500).json({message:e.message})} 
});

app.put('/parametros-taxas/:id', authenticateToken, async (req, res) => {
    const p=req.body; const u=req.user; let q,params;
    if(p.Excluido) { 
        const m=`${p.MotivoExclusao} (por ${u.usuario})`; 
        q=`UPDATE ParametrosTaxas SET Excluido=1, MotivoExclusao=@m, UsuarioAlteracao=@u OUTPUT INSERTED.* WHERE ID_Taxa=@id`; 
        params=[{name:'id',type:TYPES.Int,value:req.params.id},{name:'m',type:TYPES.NVarChar,value:m},{name:'u',type:TYPES.NVarChar,value:u.usuario}]; 
    } else { 
        const m=p.MotivoAlteracao?`${p.MotivoAlteracao} (por ${u.usuario})`:`Edição (por ${u.usuario})`; 
        q=`UPDATE ParametrosTaxas SET Cidade=@c, Pedagio=@p, Balsa=@b, Ambiental=@a, Chapa=@ch, Outras=@o, MotivoAlteracao=@m, UsuarioAlteracao=@u OUTPUT INSERTED.* WHERE ID_Taxa=@id`; 
        params=[
            {name:'id',type:TYPES.Int,value:req.params.id},{name:'c',type:TYPES.NVarChar,value:p.Cidade},
            {name:'p',type:TYPES.Decimal,value:p.Pedagio,options:{precision:18,scale:2}},{name:'b',type:TYPES.Decimal,value:p.Balsa,options:{precision:18,scale:2}},
            {name:'a',type:TYPES.Decimal,value:p.Ambiental,options:{precision:18,scale:2}},{name:'ch',type:TYPES.Decimal,value:p.Chapa,options:{precision:18,scale:2}},
            {name:'o',type:TYPES.Decimal,value:p.Outras,options:{precision:18,scale:2}},{name:'m',type:TYPES.NVarChar,value:m},
            {name:'u',type:TYPES.NVarChar,value:u.usuario}
        ]; 
    }
    try{res.json((await executeQuery(configOdin,q,params)).rows[0])}catch(e){res.status(500).json({message:e.message})}
});

app.get('/motivos-substituicao', authenticateToken, (req, res) => res.json([ { ID_Motivo: 1, Descricao: 'Correção de valor' }, { ID_Motivo: 2, Descricao: 'Alteração de rota' }, { ID_Motivo: 3, Descricao: 'Lançamento indevido' }, { ID_Motivo: 4, Descricao: 'Outro' } ]));

app.listen(port, () => console.log(`API rodando na porta ${port}`));
