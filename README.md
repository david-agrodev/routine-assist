# Routine Assist v1.3

Organizador de demandas, agenda, viagens, hotel, veículo e pendências para rotina de campo.

## O que mudou na v1.3

### Demandas
- O filtro **Todas | ALTA | GENEX** fica somente em **Demandas/Entrada**.
- Os filtros de status continuam disponíveis para localizar rapidamente uma demanda.
- Cards mantêm a identificação visual da central.

### Agenda única e sem sobreposição
- Agenda e Viagens não possuem mais filtro por central: **ALTA e GENEX ficam sempre visíveis juntas**.
- O mesmo responsável não pode ter dois atendimentos ocupando a mesma data, independentemente da central.
- A interface bloqueia conflitos e o banco ganhou um trigger de segurança para impedir sobreposição também no Supabase.
- Se existirem conflitos antigos criados antes da v1.3, o calendário mostra um alerta para que as datas sejam ajustadas.

### Calendário mais informativo
- Viagens mostram **fazendas vinculadas**, clientes e nome da viagem, em vez de exibir somente um título genérico.
- Viagens com várias fazendas exibem os nomes de forma resumida (ex.: `Fazenda Romy + Fazenda Umbelino`).
- Sábado e domingo possuem fundo visual diferente.
- Feriados nacionais são consultados pela **BrasilAPI** e destacados no calendário.
- Ao tentar agendar um atendimento em feriado nacional, o Routine mostra uma confirmação personalizada antes de salvar.
- O resumo de uma data também informa quando ela é feriado.

### Viagens
- A página ganhou uma área **“Qual viagem deseja acessar?”** com cards de todas as viagens.
- Cada card resume central, período, fazendas, hotel e veículo.
- Clique em uma viagem para abrir os detalhes e continuar hotel, veículo e rota.

## Banco de dados
A v1.3 exige executar:

```text
supabase/migration-v1.3.sql
```

A migration **não apaga dados**. Ela adiciona o bloqueio definitivo contra novos períodos sobrepostos para o mesmo responsável.

## Atualização a partir da v1.2
1. Preserve seu `.env.local`.
2. No Supabase → SQL Editor, execute `supabase/migration-v1.3.sql`.
3. Substitua os arquivos pelo conteúdo desta versão.
4. Rode:

```bash
npm install
npm run build
npm run dev
```

5. Para publicar:

```bash
git add .
git commit -m "feat: Routine Assist v1.3"
git push origin main
```

A Vercel fará o deploy automaticamente se o repositório estiver conectado.
