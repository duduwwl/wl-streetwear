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
