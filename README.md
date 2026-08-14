# WL Streetwear — site de teste

## Rodar localmente

```powershell
python app.py
```

Depois, abra `http://localhost:8000`.

## Banco de dados

Ao iniciar o servidor, o arquivo `data/wl_streetwear.db` é criado automaticamente com as tabelas `products`, `orders` e `order_items`. O catálogo inicial contém 18 peças: camisetas, blusas, shorts, óculos e bonés.

As referências multimarcas são apenas conceituais para esta loja fictícia; não há afiliação, revenda autorizada ou garantia de autenticidade indicada pelo projeto.

## Publicação de teste

O projeto inclui um `Dockerfile`, compatível com hosts de contêiner como Render ou Railway. A loja é fictícia, fica em Lavras-MG e informa entrega para todo o Brasil. Para uma publicação pública persistente, substitua o SQLite por Postgres gerenciado (por exemplo, Supabase/Neon), pois o armazenamento local em hosts pode ser temporário.

## Mercado Pago — Checkout Pro

O checkout foi preparado para criar uma preferência no backend e redirecionar o cliente ao ambiente seguro do Mercado Pago. A credencial é mantida apenas no servidor.

1. No Render, crie um **Web Service** a partir deste repositório (o arquivo `render.yaml` já descreve o serviço).
2. Configure `MERCADO_PAGO_ACCESS_TOKEN` com a credencial de teste ou produção no painel do Render. Nunca publique essa chave no GitHub ou em `assets/runtime-config.js`.
3. Depois que o Render informar a URL HTTPS do serviço, defina `MERCADO_PAGO_WEBHOOK_URL` como `https://SEU-SERVICO.onrender.com/api/payments/mercado-pago/webhook` e coloque a assinatura em `MERCADO_PAGO_WEBHOOK_SECRET`.
4. Atualize `assets/runtime-config.js` com a URL HTTPS do Render em `window.WL_API_BASE_URL` e publique novamente o site estático.

O webhook valida a assinatura recebida do Mercado Pago antes de atualizar o status do pedido. Para produção, use um banco persistente em vez do SQLite do contêiner.
