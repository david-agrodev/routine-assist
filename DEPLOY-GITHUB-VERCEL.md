# Publicação — GitHub + Vercel

## 1. Antes de enviar ao GitHub

Confirme que `.env.local` está ignorado pelo Git. Ele já está listado em `.gitignore`.

Teste localmente:

```bash
npm install
npm run build
npm run dev
```

## 2. Criar o repositório no GitHub

Crie um repositório chamado `routine-assist`. Como o projeto local já possui README e .gitignore, crie o repositório remoto **sem** README, licença ou .gitignore adicionais.

No terminal da pasta do projeto:

```bash
git init
git add .
git commit -m "feat: Routine Assist v0.8"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/routine-assist.git
git push -u origin main
```

Se `git init` já tiver sido executado antes, não é necessário executá-lo novamente.

## 3. Importar o GitHub na Vercel

Na Vercel, selecione **Add New → Project → Import Git Repository** e escolha `routine-assist`.

Configuração esperada:

- Framework Preset: Vite
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 4. Variáveis de ambiente na Vercel

Cadastre em **Project → Settings → Environment Variables**:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Use os mesmos valores do seu `.env.local`. Marque Production, Preview e Development.

Depois faça um novo deploy para as variáveis entrarem no build.

## 5. Supabase após o primeiro deploy

Quando a Vercel fornecer a URL, por exemplo:

```text
https://routine-assist.vercel.app
```

No Supabase abra **Authentication → URL Configuration** e configure:

```text
Site URL:
https://routine-assist.vercel.app

Redirect URLs:
http://localhost:5173/**
https://routine-assist.vercel.app/**
```

Se depois você conectar um domínio próprio, adicione também esse domínio.

## 6. Instalar como aplicativo

### Android / Chrome

Abra a URL publicada e use o botão **Instalar Routine Assist** em Configurações, quando disponível. Também é possível usar o menu do Chrome → Instalar app / Adicionar à tela inicial.

### iPhone / Safari

Abra a URL no Safari → Compartilhar → **Adicionar à Tela de Início**.

### Computador

Chrome/Edge podem oferecer o ícone de instalação na barra de endereço. O app também mostra a instalação em Configurações quando o navegador disponibiliza o recurso.

## 7. Atualizações futuras

Depois da publicação inicial, o fluxo normal é:

```bash
git add .
git commit -m "descrição da alteração"
git push
```

O push para `main` dispara um novo deploy de produção na Vercel. Branches diferentes podem gerar Preview Deployments.
