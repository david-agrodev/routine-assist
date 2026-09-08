# Routine Assist v1.8

Ajustes de uso real desta versão:

- atendimentos vinculados a uma viagem agora podem ser abertos individualmente;
- dentro da viagem, cada atendimento tem ações para **Editar / cancelar** e **Retirar da viagem**;
- cancelar um atendimento remove apenas aquele compromisso, mantém a viagem com os demais e recalcula o nome/rota;
- retirar da viagem mantém a demanda e o agendamento, deixando-o pronto para reorganização;
- as setas da área **Precisa da sua atenção** no Dashboard agora são clicáveis e levam à demanda ou à viagem correta;
- pendências de hotel e veículo abrem a viagem e rolam diretamente para o bloco correspondente;
- o botão **Ver viagem** da próxima viagem abre a viagem específica.

**Não há migration nova no Supabase para a v1.8.** A estrutura existente da v1.7 já suporta essas correções.

---

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
