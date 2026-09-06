# Supabase — Routine Assist v1.3

## Atualização de uma instalação existente

Execute no **SQL Editor**:

```text
supabase/migration-v1.3.sql
```

A migration cria um trigger que impede dois atendimentos do mesmo responsável de ocuparem datas sobrepostas. Ela não exclui nem altera atendimentos antigos.

> Se já existirem conflitos antigos, o app vai sinalizá-los no calendário para correção manual das datas.

## Instalação nova

Em um projeto Supabase vazio, execute:

```text
supabase/setup.sql
```

O `setup.sql` desta versão já contém o bloqueio de sobreposição.

## Variáveis do frontend

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Na Vercel, essas duas variáveis podem ser do tipo **Config**. Nunca coloque `service_role`, senha do banco ou outras chaves privadas em variáveis `VITE_*`.

## Feriados

Os feriados nacionais são carregados no navegador por uma API pública e ficam em cache local no dispositivo. Nenhuma chave adicional é necessária.
