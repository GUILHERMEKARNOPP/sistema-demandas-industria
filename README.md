# OptimaManutenção - Gestão de Reparos Corporativos

Este é um sistema profissional e centralizado de Gestão de Manutenção e Reparos Corporativos, projetado para indústrias e empresas. O objetivo do sistema é facilitar a comunicação entre os colaboradores (solicitantes) e a equipe de manutenção (técnicos), substituindo processos informais e garantindo rastreabilidade, velocidade no atendimento e relatórios consistentes.

## Funcionalidades
- **Autenticação de Usuários:** Sistema com login e cadastro de usuários (Solicitante, Técnico, Administrador).
- **Adequação LGPD:** Política de consentimento explícito (LGPD) no cadastro e na abertura de chamados.
- **Painel de Controle:** Visualização das solicitações em andamento com indicadores visuais baseados na prioridade e status do chamado.
- **Notificação Automática via WhatsApp:** Ao criar um chamado, um link direto com a API do WhatsApp é gerado para notificar o Técnico responsável imediatamente.
- **Painel Administrativo:** Tela exclusiva para o Administrador com gráficos e estatísticas gerais (distribuição por status e categoria dos chamados) usando `recharts`.
- **Tema Escuro/Claro:** O sistema conta com uma alternância (toggle) simples entre o Modo Claro (Light Mode) e Modo Escuro (Dark Mode).

## Tecnologias Utilizadas
- **React.js** e **Vite**
- **TypeScript**
- **React Router Dom** (Navegação estruturada)
- **Recharts** (Gráficos no Painel Admin)
- **Lucide-react** (Ícones modernos)
- **UUID** & **Date-fns** (Utilitários)
- **CSS Modules / Variáveis CSS** para temas e design responsivo (Glassmorphism e Neumorphism).

## Rodando Localmente

1. Faça o clone do repositório:
```bash
git clone https://github.com/GUILHERMEKARNOPP/sistema-demandas-industria.git
```

2. Acesse a pasta:
```bash
cd "sistema-demandas-industria"
```

3. Instale as dependências:
```bash
npm install
```

4. Rode o servidor de desenvolvimento:
```bash
npm run dev
```

## Como Fazer Deploy no GitHub Pages
O projeto possui integração automática para Deploy via GH-Pages. Execute o comando abaixo para compilar a build e subir para a branch correspondente.

```bash
npm run deploy
```

> **Atenção:** Na primeira execução, verifique em `Settings -> Pages` no seu repositório do GitHub se a branch `gh-pages` está configurada como 'Source' para o build.
