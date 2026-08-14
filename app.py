"""Servidor de demonstração WL Streetwear: arquivos estáticos + API SQLite."""

from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
import hashlib
import hmac
import secrets
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, unquote, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "wl_streetwear.db"
SCHEMA_PATH = DATA_DIR / "schema.sql"
MAX_BODY_BYTES = 100_000
VALID_SIZES = {"P", "M", "G", "GG"}
VALID_PAYMENTS = {"Pix", "Cartão", "Mercado Pago"}
VALID_ORDER_STATUSES = {"novo", "pago", "separando", "enviado", "entregue", "cancelado"}
MP_ACCESS_TOKEN = os.environ.get("MERCADO_PAGO_ACCESS_TOKEN", "").strip()
MP_WEBHOOK_SECRET = os.environ.get("MERCADO_PAGO_WEBHOOK_SECRET", "").strip()
MP_WEBHOOK_URL = os.environ.get("MERCADO_PAGO_WEBHOOK_URL", "").strip()
APP_BASE_URL = os.environ.get("APP_BASE_URL", "https://duduwwl.github.io/wl-streetwear").rstrip("/")
_app_url = urlparse(APP_BASE_URL)
APP_CORS_ORIGIN = f"{_app_url.scheme}://{_app_url.netloc}"

def catalog_product(slug, name, category, brand, detail, description, price_cents, image_url, badge, specs, graphic=None):
    return {"slug": slug, "name": name, "category": category, "brand": brand, "detail": detail, "description": description, "price_cents": price_cents, "image_url": image_url, "badge": badge, "graphic": graphic, "specs": specs}


SEED_PRODUCTS = [
    catalog_product("basic-white", "Camiseta Basic White", "camisetas", "WL", "Branca / 100% algodão", "A camiseta que resolve qualquer look. Branca, limpa e com caimento oversized para usar todos os dias.", 9900, "https://images.unsplash.com/photo-1583743814966-8936f37f4678?auto=format&fit=crop&w=1100&q=88", "BÁSICA", [["Cor", "Branco óptico"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão penteado · 220g"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Sem estampa"], ["Tamanhos", "P, M, G e GG"]]),
    catalog_product("basic-black", "Camiseta Basic Black", "camisetas", "WL", "Preta / 100% algodão", "Preta essencial com estrutura encorpada e visual urbano. Uma base forte para qualquer combinação.", 9900, "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1100&q=88", "BÁSICA", [["Cor", "Preto profundo"], ["Modelagem", "Oversized unissex"], ["Material", "100% algodão penteado · 220g"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Sem estampa"], ["Tamanhos", "P, M, G e GG"]]),
    catalog_product("tag-graffiti", "Blusa Stacked Type", "blusas", "WL", "Estampada / manga longa", "Blusa oversized com arte tipográfica original em alto contraste, pensada para uma leitura de streetwear de luxo.", 9900, "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1100&q=88", "BLUSA GRÁFICA", [["Cor", "Preto com arte azul"], ["Modelagem", "Oversized unissex"], ["Material", "Moletom leve · 3 cabos"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Arte tipográfica original em silk"], ["Tamanhos", "P, M, G e GG"]], "WL / STACKED 01"),
    catalog_product("concrete-riot", "Blusa Nocturnal Grid", "blusas", "WL", "Estampada / manga longa", "Uma peça escura de proporção ampla, com grid gráfico exclusivo e acabamento azul elétrico.", 9900, "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1100&q=88", "BLUSA GRÁFICA", [["Cor", "Cinza concreto"], ["Modelagem", "Oversized unissex"], ["Material", "Moletom leve · 3 cabos"], ["Gola", "Canelada com reforço interno"], ["Estampa", "Grid original frontal + assinatura traseira"], ["Tamanhos", "P, M, G e GG"]], "NOCTURNAL / GRID 02"),
    catalog_product("baw-archive", "Archive Logo Tee", "camisetas", "Baw Clothing", "Branca / estampa frontal", "Camiseta conceitual de curadoria multimarcas com lettering forte e caimento urbano.", 15900, "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Baw Clothing"], ["Modelagem", "Regular ampla"], ["Material", "Algodão premium · 200g"], ["Estampa", "Lettering frontal"], ["Tamanhos", "P, M, G e GG"]], "BAW / ARCHIVE"),
    catalog_product("balenciaga-typography", "Typo Paris Tee", "camisetas", "Balenciaga", "Preta / estampa gráfica", "Peça conceitual de curadoria com visual de luxo urbano e tipografia editorial — sem afiliação oficial.", 19900, "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Balenciaga"], ["Modelagem", "Oversized"], ["Material", "Algodão encorpado · 240g"], ["Estampa", "Tipografia frontal"], ["Tamanhos", "P, M, G e GG"]], "PARIS / TYPE 03"),
    catalog_product("supreme-box", "Box Signal Tee", "camisetas", "Supreme", "Vermelha / estampa frontal", "Peça conceitual de curadoria com energia skate e composição gráfica direta — sem afiliação oficial.", 17900, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Supreme"], ["Modelagem", "Regular ampla"], ["Material", "Algodão premium · 220g"], ["Estampa", "Box gráfico frontal"], ["Tamanhos", "P, M, G e GG"]], "SIGNAL / BOX 04"),
    catalog_product("high-street", "High Local Tee", "camisetas", "High Company", "Cinza / arte urbana", "Camiseta conceitual de curadoria brasileira com arte de rua e acabamento macio — sem afiliação oficial.", 14900, "https://images.unsplash.com/photo-1610652492500-ded49ceeb378?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "High Company"], ["Modelagem", "Oversized"], ["Material", "Algodão penteado · 220g"], ["Estampa", "Arte frontal de rua"], ["Tamanhos", "P, M, G e GG"]], "HIGH / LOCAL 05"),
    catalog_product("north-face-ice", "Ice Summit Hoodie", "blusas", "The North Face", "Azul marinho / moletom", "Moletom conceitual de curadoria outdoor com leitura urbana — sem afiliação oficial.", 22900, "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1100&q=88", "MOLETOM", [["Marca", "The North Face"], ["Modelagem", "Relaxed fit"], ["Material", "Moletom 3 cabos"], ["Capuz", "Duplo com cordão"], ["Tamanhos", "P, M, G e GG"]]),
    catalog_product("wl-heavy-hoodie", "Cloud Heavy Hoodie", "blusas", "Baw Clothing", "Preto / moletom pesado", "Moletom conceitual de curadoria Baw com ombro deslocado e volume alto — sem afiliação oficial.", 18900, "https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Baw Clothing"], ["Modelagem", "Oversized"], ["Material", "Moletom pesado · 420g"], ["Capuz", "Duplo estruturado"], ["Tamanhos", "P, M, G e GG"]]),
    catalog_product("short-basic-black", "Short Basic Black", "shorts", "WL", "Preto / sarja leve", "Short básico de cintura confortável para montar um uniforme urbano sem esforço.", 11900, "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1100&q=88", "BÁSICO", [["Cor", "Preto"], ["Modelagem", "Relaxed"], ["Material", "Sarja leve"], ["Bolsos", "Laterais + traseiro"], ["Tamanhos", "38, 40, 42, 44"]]),
    catalog_product("short-baw-cargo", "Cargo Utility Short", "shorts", "Baw Clothing", "Areia / cargo", "Short cargo conceitual de curadoria, com bolsos utilitários e leitura street — sem afiliação oficial.", 15900, "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Baw Clothing"], ["Modelagem", "Cargo relaxed"], ["Material", "Algodão ripstop"], ["Bolsos", "6 bolsos utilitários"], ["Tamanhos", "38, 40, 42, 44"]]),
    catalog_product("short-supreme-denim", "Denim Signal Short", "shorts", "Supreme", "Jeans lavado / 5 bolsos", "Short jeans conceitual de curadoria com acabamento lavado — sem afiliação oficial.", 18900, "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Supreme"], ["Modelagem", "Regular"], ["Material", "Denim lavado"], ["Bolsos", "5 bolsos"], ["Tamanhos", "38, 40, 42, 44"]], "SIGNAL / DENIM 08"),
    catalog_product("short-high-tech", "High Tech Short", "shorts", "High Company", "Cinza / nylon", "Short técnico conceitual de curadoria brasileira para dias de movimento — sem afiliação oficial.", 14900, "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "High Company"], ["Modelagem", "Sport relaxed"], ["Material", "Nylon leve"], ["Detalhes", "Cintura elástica"], ["Tamanhos", "P, M, G e GG"]], "HIGH / TECH 09"),
    catalog_product("short-night-utility", "Short Night Utility", "shorts", "WL", "Cinza / bolsos utilitários", "Short cinza de corte reto com bolsos utilitários e construção leve para o dia a dia.", 13900, "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1100&q=88", "SHORTS", [["Cor", "Cinza"], ["Modelagem", "Reta relaxed"], ["Material", "Sarja leve"], ["Detalhes", "Bolsos utilitários"], ["Tamanhos", "P, M, G e GG"]]),
    catalog_product("oculos-oakley-sport", "Sport Shield", "acessorios", "Oakley", "Preto / lente azul", "Óculos conceitual de curadoria com lente esportiva e acabamento técnico — sem afiliação oficial.", 21900, "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Oakley"], ["Lente", "Azul com proteção UV"], ["Armação", "Policarbonato"], ["Ajuste", "Unissex"], ["Inclui", "Estojo conceitual"]]),
    catalog_product("oculos-wl-frame", "WL Frame 01", "acessorios", "WL", "Preto / lente fumê", "Óculos WL com linhas geométricas e acabamento escuro para completar o uniforme.", 12900, "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1100&q=88", "WL ACCESSORIES", [["Marca", "WL Streetwear"], ["Lente", "Fumê"], ["Armação", "Acetato preto"], ["Ajuste", "Unissex"], ["Inclui", "Case rígido"]], "WL / FRAME 11"),
    catalog_product("bone-supreme-panel", "6 Panel Signal", "acessorios", "Supreme", "Vermelho / aba curva", "Boné conceitual de curadoria com construção clássica e energia skate — sem afiliação oficial.", 11900, "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "Supreme"], ["Modelo", "6 panel"], ["Material", "Algodão"], ["Ajuste", "Fivela traseira"], ["Tamanho", "Único"]], "SIGNAL / CAP 12"),
    catalog_product("bone-high-curve", "High Curve Cap", "acessorios", "High Company", "Azul / aba curva", "Boné conceitual de curadoria com cor elétrica e bordado frontal — sem afiliação oficial.", 10900, "https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?auto=format&fit=crop&w=1100&q=88", "CURADORIA", [["Marca", "High Company"], ["Modelo", "Aba curva"], ["Material", "Algodão lavado"], ["Ajuste", "Regulável"], ["Tamanho", "Único"]]),
]


def connection() -> sqlite3.Connection:
    database = sqlite3.connect(DB_PATH)
    database.row_factory = sqlite3.Row
    database.execute("PRAGMA foreign_keys = ON")
    return database


def initialize_database() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    with connection() as database:
        database.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        columns = {row["name"] for row in database.execute("PRAGMA table_info(products)").fetchall()}
        if "category" not in columns:
            database.execute("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'camisetas'")
        if "brand" not in columns:
            database.execute("ALTER TABLE products ADD COLUMN brand TEXT NOT NULL DEFAULT 'WL'")
        if "stock" not in columns:
            database.execute("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 12")
        order_columns = {row["name"] for row in database.execute("PRAGMA table_info(orders)").fetchall()}
        if "mp_preference_id" not in order_columns:
            database.execute("ALTER TABLE orders ADD COLUMN mp_preference_id TEXT")
        if "mp_payment_id" not in order_columns:
            database.execute("ALTER TABLE orders ADD COLUMN mp_payment_id TEXT")
        if "mp_payment_status" not in order_columns:
            database.execute("ALTER TABLE orders ADD COLUMN mp_payment_status TEXT")
        image_by_category = {
            "camisetas": "/assets/images/tee-editorial.png",
            "blusas": "/assets/images/hoodie-editorial.png",
            "shorts": "/assets/images/shorts-editorial.png",
            "bones": "/assets/images/accessories-editorial.png",
            "oculos": "/assets/images/accessories-editorial.png",
        }
        image_by_slug = {
            "tag-graffiti": "/assets/images/hoodie-editorial.png",
            "concrete-riot": "/assets/images/hoodie-sand.png",
            "north-face-ice": "/assets/images/hoodie-navy.png",
            "wl-heavy-hoodie": "/assets/images/hoodie-charcoal.png",
            "basic-black": "/assets/images/tee-black-white-stroke.png",
            "baw-archive": "/assets/images/tee-blue-graffiti.png",
            "balenciaga-typography": "/assets/images/tee-signal-lime.png",
            "supreme-box": "/assets/images/tee-red-stencil.png",
            "short-high-tech": "/assets/images/glasses-tech-shield.png",
            "short-night-utility": "/assets/images/short-grey-utility.png",
            "oculos-wl-frame": "/assets/images/glasses-silver-frame.png",
            "bone-supreme-panel": "/assets/images/cap-black-panel.png",
            "bone-high-curve": "/assets/images/cap-navy-premium.png",
        }
        catalog_overrides = {
            "basic-black": {"name": "Camiseta Black Stroke", "brand": "WL", "detail": "Preta / estampa branca", "description": "Camiseta preta oversized com arte branca em pinceladas largas e acabamento urbano.", "graphic": None},
            "baw-archive": {"name": "Camiseta Blue Graffiti", "brand": "WL", "detail": "Off-white / estampa azul", "description": "Camiseta off-white com estampa azul de traço livre, criada para composições de rua.", "graphic": None},
            "balenciaga-typography": {"name": "Camiseta Lime Signal", "brand": "WL", "detail": "Chumbo / estampa azul e verde", "description": "Camiseta chumbo com sinal gráfico em azul e verde-lima, original da curadoria WL.", "graphic": None},
            "supreme-box": {"name": "Camiseta Red Stencil", "brand": "WL", "detail": "Azul-marinho / estampa vermelha", "description": "Camiseta azul-marinho com arte stencil vermelha e riscos claros em uma leitura streetwear.", "graphic": None},
            "high-street": {"name": "Camiseta Abstract Heart", "brand": "WL", "detail": "Off-white / estampa abstrata", "description": "Camiseta off-white com arte abstrata de alto contraste e caimento oversized.", "graphic": None},
            "short-high-tech": {"name": "Óculos Tech Shield", "category": "oculos", "brand": "WL", "badge": "ÓCULOS", "detail": "Preto / lente azul", "description": "Óculos de lente envolvente com leitura esportiva e acabamento técnico para o dia a dia.", "graphic": None, "specs": [["Lente", "Azul com proteção UV"], ["Armação", "Policarbonato preto"], ["Modelo", "Lente envolvente"], ["Ajuste", "Unissex"], ["Inclui", "Case rígido"]]},
            "oculos-wl-frame": {"name": "Óculos Street Frame", "category": "oculos", "brand": "WL", "badge": "ÓCULOS", "detail": "Preto / lente prata", "description": "Óculos esportivo de lente prata espelhada e armação preta para fechar o look street.", "graphic": None, "specs": [["Lente", "Prata espelhada com proteção UV"], ["Armação", "Policarbonato preto"], ["Modelo", "Shield esportivo"], ["Ajuste", "Unissex"], ["Inclui", "Case rígido"]]},
            "bone-supreme-panel": {"name": "Boné Black Panel", "category": "bones", "brand": "WL", "badge": "BONÉ", "detail": "Preto / aba curva", "description": "Boné preto 6-panel com detalhe azul discreto e ajuste traseiro.", "graphic": None, "specs": [["Cor", "Preto"], ["Modelo", "6 panel"], ["Material", "Algodão estruturado"], ["Ajuste", "Fivela traseira"], ["Tamanho", "Único"]]},
            "bone-high-curve": {"name": "Boné High Curve", "category": "bones", "brand": "WL", "badge": "BONÉ", "detail": "Azul / aba curva", "description": "Boné de aba curva com construção leve, ajuste traseiro e presença street.", "graphic": None},
        }
        price_overrides = {
            "basic-white": 10900, "basic-black": 11900, "baw-archive": 10000,
            "balenciaga-typography": 12000, "supreme-box": 11000, "high-street": 11500,
            "tag-graffiti": 24900, "concrete-riot": 25900, "north-face-ice": 24900,
            "wl-heavy-hoodie": 27900, "short-basic-black": 10000, "short-baw-cargo": 10000,
            "short-supreme-denim": 10000, "short-high-tech": 9990, "short-night-utility": 10000,
            "oculos-oakley-sport": 9990, "oculos-wl-frame": 9990,
            "bone-supreme-panel": 7000, "bone-high-curve": 7000,
        }
        for product in SEED_PRODUCTS:
            if product["slug"].startswith("oculos-"):
                product["category"] = "oculos"
            elif product["slug"].startswith("bone-"):
                product["category"] = "bones"
            product.update(catalog_overrides.get(product["slug"], {}))
            product["price_cents"] = price_overrides.get(product["slug"], product["price_cents"])
            product["image_url"] = image_by_slug.get(product["slug"], image_by_category.get(product["category"], product["image_url"]))
            database.execute(
                """
                INSERT INTO products (slug, name, category, brand, detail, description, price_cents, image_url, badge, graphic, specs_json)
                VALUES (:slug, :name, :category, :brand, :detail, :description, :price_cents, :image_url, :badge, :graphic, :specs_json)
                ON CONFLICT(slug) DO UPDATE SET
                  name = excluded.name,
                  category = excluded.category,
                  brand = excluded.brand,
                  detail = excluded.detail,
                  description = excluded.description,
                  price_cents = excluded.price_cents,
                  image_url = excluded.image_url,
                  badge = excluded.badge,
                  graphic = excluded.graphic,
                  specs_json = excluded.specs_json
                """,
                {**product, "specs_json": json.dumps(product["specs"], ensure_ascii=False)},
            )
        database.execute("UPDATE products SET active = 0 WHERE slug IN ('short-basic-black', 'short-baw-cargo', 'short-supreme-denim')")


def product_payload(row: sqlite3.Row) -> dict:
    return {
        "slug": row["slug"],
        "name": row["name"],
        "category": row["category"],
        "brand": row["brand"],
        "detail": row["detail"],
        "description": row["description"],
        "price": row["price_cents"] / 100,
        "image": row["image_url"],
        "badge": row["badge"],
        "graphic": row["graphic"],
        "specs": json.loads(row["specs_json"]),
    }


def order_payload(database: sqlite3.Connection, order: sqlite3.Row) -> dict:
    items = database.execute(
        "SELECT product_name, size, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY id",
        (order["id"],),
    ).fetchall()
    status = "pago" if order["status"] == "test_paid" else order["status"]
    return {
        "reference": order["reference"], "customer": order["customer_name"], "email": order["customer_email"],
        "address": order["shipping_address"], "city": order["city"], "zip": order["zip_code"],
        "payment": order["payment_method"], "total": order["total_cents"] / 100, "status": status,
        "created_at": order["created_at"],
        "items": [dict(item) | {"unit_price": item["unit_price_cents"] / 100} for item in items],
    }


def admin_product_payload(row: sqlite3.Row) -> dict:
    return {
        "slug": row["slug"], "name": row["name"], "category": row["category"], "brand": row["brand"],
        "stock": row["stock"], "active": bool(row["active"]), "image": row["image_url"],
    }


def mercado_pago_request(endpoint: str, method: str = "GET", payload: dict | None = None) -> dict:
    """Faz chamadas ao Mercado Pago sem expor a credencial ao navegador."""
    if not MP_ACCESS_TOKEN:
        raise ValueError("Mercado Pago ainda não foi configurado no servidor")
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    request = Request(
        f"https://api.mercadopago.com{endpoint}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {MP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        try:
            detail = json.loads(error.read().decode("utf-8")).get("message", "")
        except (json.JSONDecodeError, UnicodeDecodeError):
            detail = ""
        raise ValueError(f"Mercado Pago não aceitou o pagamento ({error.code}) {detail}".strip()) from error
    except URLError as error:
        raise ValueError("Não foi possível conectar ao Mercado Pago") from error


def create_mercado_pago_preference(order: dict, reference: str) -> dict:
    items = [
        {
            "id": str(item["product_id"]),
            "title": item["product_name"],
            "description": f"Tamanho {item['size']}",
            "quantity": item["quantity"],
            "currency_id": "BRL",
            "unit_price": round(item["price_cents"] / 100, 2),
        }
        for item in order["items"]
    ]
    preference = {
        "items": items,
        "external_reference": reference,
        "payer": {
            "name": order["customer"]["name"],
            "email": order["customer"]["email"],
            "address": {
                "street_name": order["customer"]["address"],
                "zip_code": order["customer"]["zip"],
            },
        },
        "back_urls": {
            "success": f"{APP_BASE_URL}/pagamento.html?status=approved",
            "pending": f"{APP_BASE_URL}/pagamento.html?status=pending",
            "failure": f"{APP_BASE_URL}/pagamento.html?status=failure",
        },
        "auto_return": "approved",
        "statement_descriptor": "WL STREETWEAR",
    }
    if MP_WEBHOOK_URL:
        preference["notification_url"] = MP_WEBHOOK_URL
    return mercado_pago_request("/checkout/preferences", "POST", preference)


def create_mercado_pago_order(payload: dict) -> dict:
    order = validate_order(payload)
    if order["payment_method"] != "Mercado Pago":
        raise ValueError("Forma de pagamento inválida")
    reference = f"WL-{uuid.uuid4().hex[:8].upper()}"
    preference = create_mercado_pago_preference(order, reference)
    checkout_url = preference.get("sandbox_init_point") or preference.get("init_point")
    if not checkout_url:
        raise ValueError("Mercado Pago não retornou uma URL de checkout")
    save_order(order, reference)
    with connection() as database:
        database.execute("UPDATE orders SET mp_preference_id = ? WHERE reference = ?", (str(preference.get("id", "")), reference))
    return {"reference": reference, "checkout_url": checkout_url, "total": order["total_cents"] / 100}


def valid_mercado_pago_signature(signature: str, request_id: str, data_id: str) -> bool:
    if not MP_WEBHOOK_SECRET:
        return False
    parts = dict(part.split("=", 1) for part in signature.split(",") if "=" in part)
    timestamp, signature_hash = parts.get("ts", ""), parts.get("v1", "")
    manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{timestamp};"
    expected = hmac.new(MP_WEBHOOK_SECRET.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256).hexdigest()
    return bool(signature_hash) and hmac.compare_digest(signature_hash, expected)


def process_mercado_pago_webhook(data_id: str, signature: str, request_id: str) -> None:
    if not data_id or not valid_mercado_pago_signature(signature, request_id, data_id):
        raise PermissionError("Assinatura de webhook inválida")
    payment = mercado_pago_request(f"/v1/payments/{data_id}")
    reference = str(payment.get("external_reference", ""))
    if not reference.startswith("WL-"):
        return
    payment_status = str(payment.get("status", ""))
    status_map = {"approved": "pago", "rejected": "cancelado", "cancelled": "cancelado"}
    with connection() as database:
        database.execute(
            "UPDATE orders SET mp_payment_id = ?, mp_payment_status = ? WHERE reference = ?",
            (str(payment.get("id", data_id)), payment_status, reference),
        )
    if payment_status in status_map:
        update_order_status(reference, status_map[payment_status])


class StoreHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        origin = self.headers.get("Origin", "")
        if origin == APP_CORS_ORIGIN:
            self.send_header("Access-Control-Allow-Origin", APP_CORS_ORIGIN)
            self.send_header("Vary", "Origin")
        super().end_headers()

    def send_json(self, payload: dict | list, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Allow", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json({"status": "ok", "database": "sqlite"})
            return
        if path == "/api/products":
            with connection() as database:
                rows = database.execute("SELECT * FROM products WHERE active = 1 ORDER BY id").fetchall()
            self.send_json([product_payload(row) for row in rows])
            return
        if path == "/api/orders":
            with connection() as database:
                orders = database.execute("SELECT * FROM orders ORDER BY datetime(created_at) DESC, id DESC").fetchall()
                payload = [order_payload(database, order) for order in orders]
            self.send_json(payload)
            return
        if path == "/api/admin/overview":
            with connection() as database:
                orders = database.execute("SELECT * FROM orders ORDER BY datetime(created_at) DESC, id DESC").fetchall()
                products = database.execute("SELECT * FROM products ORDER BY active DESC, category, name").fetchall()
                self.send_json({"orders": [order_payload(database, order) for order in orders], "products": [admin_product_payload(product) for product in products]})
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        content_length = int(self.headers.get("Content-Length", "0"))
        if path == "/api/payments/mercado-pago/webhook":
            try:
                body = json.loads(self.rfile.read(content_length).decode("utf-8")) if content_length else {}
                query = parse_qs(parsed_url.query)
                data_id = str(query.get("data.id", [body.get("data", {}).get("id", "")])[0])
                process_mercado_pago_webhook(data_id, self.headers.get("x-signature", ""), self.headers.get("x-request-id", ""))
            except PermissionError as error:
                self.send_json({"error": str(error)}, HTTPStatus.UNAUTHORIZED)
                return
            except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
                self.send_json({"error": str(error) or "Webhook inválido"}, HTTPStatus.BAD_REQUEST)
                return
            self.send_json({"received": True})
            return
        if not 0 < content_length <= MAX_BODY_BYTES:
            self.send_json({"error": "Corpo da requisição inválido"}, HTTPStatus.BAD_REQUEST)
            return
        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            if path == "/api/auth/register":
                self.send_json(register_customer(payload), HTTPStatus.CREATED)
                return
            if path == "/api/auth/login":
                self.send_json(login_customer(payload))
                return
            if path == "/api/payments/mercado-pago":
                self.send_json(create_mercado_pago_order(payload), HTTPStatus.CREATED)
                return
            if path != "/api/orders":
                self.send_json({"error": "Endpoint não encontrado"}, HTTPStatus.NOT_FOUND)
                return
            order = validate_order(payload)
            reference = save_order(order)
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error) or "Pedido inválido"}, HTTPStatus.BAD_REQUEST)
            return
        self.send_json({"reference": reference, "total": order["total_cents"] / 100}, HTTPStatus.CREATED)

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path
        content_length = int(self.headers.get("Content-Length", "0"))
        if not 0 < content_length <= MAX_BODY_BYTES:
            self.send_json({"error": "Corpo da requisição inválido"}, HTTPStatus.BAD_REQUEST)
            return
        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Dados inválidos")
            if path.startswith("/api/admin/orders/"):
                reference = unquote(path.rsplit("/", 1)[-1])
                status = str(payload.get("status", ""))
                update_order_status(reference, status)
                self.send_json({"reference": reference, "status": status})
                return
            if path.startswith("/api/admin/products/"):
                slug = unquote(path.rsplit("/", 1)[-1])
                update_product_inventory(slug, payload)
                self.send_json({"slug": slug, "updated": True})
                return
            self.send_json({"error": "Endpoint não encontrado"}, HTTPStatus.NOT_FOUND)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error) or "Dados inválidos"}, HTTPStatus.BAD_REQUEST)


def validate_order(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Pedido inválido")
    customer = payload.get("customer", {})
    items = payload.get("items", [])
    fields = {"name": 120, "email": 160, "address": 240, "city": 100, "zip": 18}
    normalized = {}
    for field, limit in fields.items():
        value = str(customer.get(field, "")).strip()
        if not value or len(value) > limit:
            raise ValueError(f"Campo inválido: {field}")
        normalized[field] = value
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized["email"]):
        raise ValueError("E-mail inválido")
    payment = str(payload.get("payment_method", ""))
    if payment not in VALID_PAYMENTS:
        raise ValueError("Forma de pagamento inválida")
    if not isinstance(items, list) or not 1 <= len(items) <= 20:
        raise ValueError("Itens inválidos")

    sanitized_items = []
    with connection() as database:
        for item in items:
            slug = str(item.get("id", ""))
            size = str(item.get("size", ""))
            quantity = item.get("quantity")
            if size not in VALID_SIZES or not isinstance(quantity, int) or not 1 <= quantity <= 10:
                raise ValueError("Item inválido")
            product = database.execute("SELECT id, name, price_cents, stock FROM products WHERE slug = ? AND active = 1", (slug,)).fetchone()
            if not product:
                raise ValueError("Produto indisponível")
            if product["stock"] < quantity:
                raise ValueError(f"Estoque indisponível para: {product['name']}")
            sanitized_items.append({"product_id": product["id"], "product_name": product["name"], "price_cents": product["price_cents"], "size": size, "quantity": quantity})
    total_cents = sum(item["price_cents"] * item["quantity"] for item in sanitized_items)
    return {"customer": normalized, "items": sanitized_items, "payment_method": payment, "total_cents": total_cents}


def save_order(order: dict, reference: str | None = None) -> str:
    reference = reference or f"WL-{uuid.uuid4().hex[:8].upper()}"
    with connection() as database:
        cursor = database.execute(
            """
            INSERT INTO orders (reference, customer_name, customer_email, shipping_address, city, zip_code, payment_method, total_cents, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'novo')
            """,
            (reference, order["customer"]["name"], order["customer"]["email"], order["customer"]["address"], order["customer"]["city"], order["customer"]["zip"], order["payment_method"], order["total_cents"]),
        )
        order_id = cursor.lastrowid
        database.executemany(
            """
            INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price_cents)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [(order_id, item["product_id"], item["product_name"], item["size"], item["quantity"], item["price_cents"]) for item in order["items"]],
        )
        for item in order["items"]:
            result = database.execute(
                "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
                (item["quantity"], item["product_id"], item["quantity"]),
            )
            if result.rowcount != 1:
                raise ValueError(f"Estoque indisponível para: {item['product_name']}")
    return reference


def update_order_status(reference: str, status: str) -> None:
    if status not in VALID_ORDER_STATUSES:
        raise ValueError("Status de pedido inválido")
    with connection() as database:
        order = database.execute("SELECT id, status FROM orders WHERE reference = ?", (reference,)).fetchone()
        if not order:
            raise ValueError("Pedido não encontrado")
        previous = "pago" if order["status"] == "test_paid" else order["status"]
        items = database.execute("SELECT product_id, quantity, product_name FROM order_items WHERE order_id = ?", (order["id"],)).fetchall()
        if previous != "cancelado" and status == "cancelado":
            for item in items:
                database.execute("UPDATE products SET stock = stock + ? WHERE id = ?", (item["quantity"], item["product_id"]))
        elif previous == "cancelado" and status != "cancelado":
            for item in items:
                result = database.execute("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", (item["quantity"], item["product_id"], item["quantity"]))
                if result.rowcount != 1:
                    raise ValueError(f"Estoque insuficiente para reativar: {item['product_name']}")
        database.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order["id"]))


def update_product_inventory(slug: str, payload: dict) -> None:
    if not re.fullmatch(r"[a-z0-9-]{2,80}", slug):
        raise ValueError("Produto inválido")
    stock = payload.get("stock")
    active = payload.get("active")
    if not isinstance(stock, int) or isinstance(stock, bool) or not 0 <= stock <= 9_999:
        raise ValueError("Estoque inválido")
    if not isinstance(active, bool):
        raise ValueError("Disponibilidade inválida")
    with connection() as database:
        result = database.execute("UPDATE products SET stock = ?, active = ? WHERE slug = ?", (stock, int(active and stock > 0), slug))
        if result.rowcount != 1:
            raise ValueError("Produto não encontrado")


def customer_fields(payload: dict, include_name: bool) -> tuple[str, str, str]:
    if not isinstance(payload, dict):
        raise ValueError("Dados de acesso inválidos")
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if include_name and not 2 <= len(name) <= 120:
        raise ValueError("Informe seu nome completo")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 160:
        raise ValueError("E-mail inválido")
    if not 6 <= len(password) <= 128:
        raise ValueError("A senha deve ter entre 6 e 128 caracteres")
    return name, email, password


def password_digest(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000).hex()


def public_customer(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def register_customer(payload: dict) -> dict:
    name, email, password = customer_fields(payload, include_name=True)
    salt = secrets.token_bytes(16)
    try:
        with connection() as database:
            cursor = database.execute(
                "INSERT INTO customers (name, email, password_salt, password_hash) VALUES (?, ?, ?, ?)",
                (name, email, salt.hex(), password_digest(password, salt)),
            )
            customer = database.execute("SELECT id, name, email FROM customers WHERE id = ?", (cursor.lastrowid,)).fetchone()
    except sqlite3.IntegrityError as error:
        raise ValueError("Já existe uma conta com este e-mail") from error
    return {"customer": public_customer(customer)}


def login_customer(payload: dict) -> dict:
    _, email, password = customer_fields(payload, include_name=False)
    with connection() as database:
        customer = database.execute("SELECT * FROM customers WHERE email = ?", (email,)).fetchone()
    if not customer:
        raise ValueError("E-mail ou senha incorretos")
    digest = password_digest(password, bytes.fromhex(customer["password_salt"]))
    if not hmac.compare_digest(digest, customer["password_hash"]):
        raise ValueError("E-mail ou senha incorretos")
    return {"customer": public_customer(customer)}


if __name__ == "__main__":
    initialize_database()
    port = int(os.environ.get("PORT", "8000"))
    print(f"WL Streetwear disponível em http://127.0.0.1:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), StoreHandler).serve_forever()
