# Routine Assist v1.7

Ajustes finais de rota e login.

## Novidades

- **Rota planejada somente de ida**:
  - ponto de partida -> paradas/fazendas -> última parada;
  - o retorno ao ponto de partida não entra mais na distância nem no tempo estimado;
  - o bloco "Retorno considerado" foi removido da tela da viagem.
- A migration `supabase/migration-v1.7.sql` limpa somente as estimativas antigas de rota, para evitar exibir valores de ida + volta salvos pela v1.6. Depois basta clicar em **Calcular/Recalcular rota**.
- **Login corrigido**:
  - identidade do Routine Assist aparece corretamente no painel escuro, sem o quadrado branco;
  - o mesmo símbolo oficial é mantido no mobile;
  - campo de senha ganhou botão personalizado de **mostrar/ocultar senha**.

## Atualização

1. Preserve o seu `.env.local`.
2. Rode `supabase/migration-v1.7.sql` no SQL Editor do Supabase.
3. Substitua os arquivos pela v1.7.
4. Rode:

```bash
npm install
npm run build
npm run dev
```

5. Se estiver tudo certo:

```bash
git add .
git commit -m "feat: Routine Assist v1.7"
git push origin main
```
