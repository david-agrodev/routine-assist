# Routine Assist v1.6

Atualização de rota, ponto de partida, nomes automáticos de viagens unificadas e regra de conflito por viagem.

## Novidades

- **Origem** virou **Ponto de partida**.
- Cidade/UF dos destinos continuam vindo das demandas; não são preenchidas novamente na viagem.
- O Routine sugere nomes de viagem conforme os destinos vinculados:
  - `Viagem Heliodora`
  - `Viagem Heliodora • 2 atendimentos`
  - `Viagem Inhumas + Aparecida de Goiânia`
- Ao adicionar atendimento a uma viagem com nome automático, o nome é recalculado.
- **Calcular rota aproximada** na tela da viagem:
  - geocodificação de cidade via Open-Meteo;
  - rota rodoviária via OSRM;
  - distância e tempo estimados;
  - cálculo considera retorno ao ponto de partida.
- A estimativa usa os **centros das cidades**, pois o Routine ainda não exige coordenada/endereço exato da fazenda.
- Conflitos antigos entre atendimentos da **mesma viagem** deixam de ser exibidos como conflito.
- Ao editar datas de atendimentos já vinculados à mesma viagem, a sobreposição entre eles é permitida. Viagens diferentes continuam bloqueadas.

## Atualização

1. Preserve o seu `.env.local`.
2. Rode `supabase/migration-v1.6.sql` no SQL Editor do Supabase.
3. Substitua os arquivos pela v1.6.
4. Rode:

```bash
npm install
npm run build
npm run dev
```

5. Se estiver tudo certo:

```bash
git add .
git commit -m "feat: Routine Assist v1.6"
git push origin main
```
