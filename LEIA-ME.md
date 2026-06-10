# 🍰 Essência no Pote — Sistema de Pedidos (Next.js)

## Como rodar

1. Instale o [Node.js](https://nodejs.org) (versão LTS)
2. Abra o terminal nesta pasta (`essencia-next`) e rode **uma vez**: `npm install`
3. Para desenvolver: `npm run dev` · Para usar de verdade: `npm run build` e depois `npm start`
4. Acesse:
   - **Loja (cliente):** http://localhost:3000
   - **Painel admin:** http://localhost:3000/admin — PIN inicial: `2026`

## ⚠️ Configure antes de usar

Abra `data/db.json` (criado na primeira execução) e altere em `config`:

- `pixKey` — sua chave Pix real (telefone, CPF, e-mail ou aleatória)
- `merchantName` — nome do recebedor **sem acentos**, máx. 25 caracteres
- `merchantCity` — cidade **sem acentos**, máx. 15 caracteres
- `adminPin` — troque o PIN do painel
- `whatsapp` — número com DDI (ex.: 5531995076141)

## Fluxo do pedido

1. Cliente escaneia o QR code da embalagem → abre o site
2. Escolhe sabores → informa nome → recebe QR Pix com o valor exato
3. Paga e toca em **"Já fiz o pagamento"**
4. No admin aparece **"Conferir pgto ⚠️"** → confira no extrato e clique **"Confirmar pgto ✓"**
5. Recibo imprimível em `/recibo/ID` (cliente e admin)

Estoque é reservado ao criar o pedido e devolvido se cancelar.

## Estrutura

- `app/page.js` — loja
- `app/admin/page.js` — painel
- `app/recibo/[id]/page.js` — recibo
- `app/api/**` — API (pedidos, sabores, admin)
- `lib/db.js` — banco JSON + geração do Pix (BR Code)
- `data/db.json` — dados (faça backup!)

## Publicar na internet

O projeto está pronto para deploy, mas atenção: na **Vercel o banco em arquivo não persiste** (sistema de arquivos é temporário). Para publicar, use um servidor com disco (Render com disk, Railway com volume, ou VPS) — ou me peça para trocar o banco por um gratuito na nuvem (ex.: Turso/Supabase).
