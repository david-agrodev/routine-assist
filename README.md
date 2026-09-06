# Routine Assist v1.4

Organizador de demandas, agenda, viagens, hospedagem e veículo para rotina de campo.

## Novidades da v1.4

- A aba **Viagens** não abre mais uma viagem automaticamente. Primeiro você escolhe o card desejado.
- Página de viagens reorganizada com cards de seleção e área de detalhes mais clara.
- Novos ícones personalizados e microinterações nos cards de viagem, hotel, veículo, atendimentos e rota.
- Indicador visual de preparação da viagem com progresso.
- Tela de demanda recebeu ajustes de alinhamento e melhor aproveitamento da área útil.
- O **Calendário abre em Mês** por padrão.
- Edição de hospedagem reforçada: atualização passa a validar a reserva no Supabase e exibir erro caso a linha não seja encontrada.
- Modal de hospedagem reorganizado em Hotel/Localização, Período, Valor e Reserva.

## Atualização

Não há migration SQL nova nesta versão. Continue com o banco atualizado até a v1.3.

Preserve seu `.env.local` e execute:

```bash
npm install
npm run build
npm run dev
```

Para publicar:

```bash
git add .
git commit -m "feat: Routine Assist v1.4"
git push origin main
```

A Vercel conectada ao repositório fará o deploy automaticamente.
