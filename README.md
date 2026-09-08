# Routine Assist v1.9

Versão focada em continuidade de uso, agenda mais informativa e logística aérea.

## Novidades

### Continuidade ao trocar de aba
- O Routine não desmonta mais a aplicação em refresh de token/retorno para a aba do navegador.
- A última tela continua sendo restaurada.
- Demanda aberta, aba interna e rascunhos continuam persistidos.
- O modal de Nova demanda também volta aberto caso a aplicação seja remontada.
- A antiga tela recorrente “Preparando sua rotina...” foi substituída por um splash discreto usado apenas no carregamento inicial real.

### Agenda mais útil
- Viagens mostram **fazenda, cliente e responsável comercial**.
- Os cards exibem ícones personalizados de **hotel, veículo e passagem aérea** quando esses itens fazem parte da viagem.
- O ícone indica visualmente se a logística está pronta ou pendente.

### Passagem aérea
- A viagem agora pode ser marcada como **Precisa de passagem aérea**.
- Novo bloco de Passagem aérea na página da viagem.
- Status: `Ainda não solicitei`, `E-mail enviado`, `Passagem confirmada`.
- Cadastro de ida/retorno, horários desejados, companhia, localizador e números dos voos.
- Alertas antecipados também cobram passagem pendente.
- Quando existe voo, o destino da ida pode ser usado como início da rota terrestre.

### Solicitação pelo Outlook
- Destinatário fixo: `keyla.santos@urus.org`.
- O Routine abre o Outlook Web com destinatário, assunto e corpo já montados.
- Assunto padrão: `Solicitação de Passagem Aérea | Nome | Origem → Destino | ida a volta`.
- Corpo inclui nome completo, CPF, telefone, data de nascimento, datas, horários e observações.
- Dados pessoais do passageiro são cadastrados uma única vez em **Configurações → Dados do passageiro**.

## Banco de dados

A v1.9 exige executar:

`supabase/migration-v1.9.sql`

A migration adiciona os dados de passageiro ao perfil, suporte a passagem na viagem e a tabela `flight_reservations`. Não apaga dados existentes.

## Atualização local

1. Preserve seu `.env.local`.
2. Execute `supabase/migration-v1.9.sql` no SQL Editor do Supabase.
3. Substitua os arquivos do projeto pela v1.9.
4. Rode:

```bash
npm install
npm run build
npm run dev
```

5. Depois de validar:

```bash
git add .
git commit -m "feat: Routine Assist v1.9"
git push origin main
```

A Vercel fará o deploy automaticamente.
