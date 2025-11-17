# ===================================================================
# Dockerfile para a API do Sistema de Fretes (Referência)
# ===================================================================

# Etapa 1: Definir a imagem base
# Usamos a versão 18 do Node.js com Alpine Linux, que é leve e segura.
FROM node:18-alpine

# Etapa 2: Definir o diretório de trabalho dentro do container
# Todos os comandos a seguir serão executados a partir deste diretório.
WORKDIR /usr/src/app

# Etapa 3: Copiar os arquivos de dependência da pasta 'api'
# O caminho 'api/package.json' é relativo à raiz do repositório (o contexto do build).
# Copiamos o package.json primeiro para aproveitar o cache do Docker.
COPY api/package.json ./

# Etapa 4: Instalar as dependências do projeto
# Este comando lê o package.json e instala pacotes como express, tedious, etc.
RUN npm install

# Etapa 5: Copiar o restante do código da API para o container
# Copia o index.js e qualquer outro arquivo da pasta 'api'.
COPY api/ ./

# Etapa 6: Expor a porta que a API usará
# O servidor Express está configurado para rodar na porta 3000.
EXPOSE 3000

# Etapa 7: Definir o comando para iniciar a aplicação
# Este comando será executado quando o container iniciar. 'npm start' executa 'node index.js'.
CMD [ "npm", "start" ]
