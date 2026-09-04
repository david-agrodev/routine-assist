# Routine Assist v0.8

# Routine Assist v0.7

Organizador de demandas, agenda e viagens desenvolvido em React + TypeScript + Vite, com Supabase como banco/autenticação.

## Novidades da v0.7

- Hospedagem mais completa:
  - reaproveita hotéis já cadastrados;
  - telefone, endereço e observações;
  - edição de hospedagem existente;
  - diária ou valor total;
  - cálculo visual de noites e total estimado;
  - atalhos para Google Maps e Waze.
- Veículo mais completo:
  - acesso direto ao Forms corporativo;
  - botão rápido “já enviei o Forms”;
  - status solicitado/confirmado/retirado/devolvido;
  - Localiza ou Unidas;
  - localizador, retirada e observações.
- Alertas configuráveis:
  - 14, 7, 3 e 1 dia antes;
  - preferências salvas no Supabase;
  - sino e dashboard respeitam as preferências;
  - notificações do navegador quando o Routine/PWA estiver ativo e autorizado.
- Calendário:
  - visual Mês, Semana e Agenda;
  - compromissos de vários dias continuam sendo exibidos como faixas contínuas;
  - botão “Hoje”.
- Central de notificações agora abre diretamente a viagem ou demanda relacionada.
- Dashboard ganhou destaque para compromissos do dia.

## Atualização

1. Pare a versão anterior com `Ctrl + C`.
2. Guarde seu `.env.local` atual.
3. Extraia esta versão em uma nova pasta.
4. Copie seu `.env.local` para a nova pasta.
5. Rode:

```bash
npm install
npm run dev
```

## Supabase

A v0.7 usa as tabelas já criadas pela configuração anterior. **Não é necessário rodar SQL novo** se o `setup.sql` da v0.3/v0.6 já foi aplicado com sucesso.

## Observação sobre notificações

O app já solicita permissão e emite avisos do dispositivo quando o navegador/PWA está ativo. Push totalmente em segundo plano, com o app fechado, ainda requer conectar a `push_subscriptions` a uma Edge Function/serviço de push.


## Publicação

Veja `DEPLOY-GITHUB-VERCEL.md` para publicar no GitHub, Vercel e instalar como PWA.
