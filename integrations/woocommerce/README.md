# DocumentiUlia pentru WooCommerce - Plugin Oficial

Plugin oficial pentru sincronizarea automată între DocumentiUlia și WooCommerce.

## 📋 Caracteristici

### Sincronizare Bidirecțională
- **Produse**: Sincronizare completă a informațiilor produselor
- **Stoc**: Sincronizare în timp real a nivelurilor de stoc
- **Comenzi**: Export automat comenzi ca facturi în DocumentiUlia
- **Prețuri**: Sincronizare prețuri și categorii

### Opțiuni Flexibile de Sincronizare
- **WooCommerce → DocumentiUlia**: Export produse și comenzi
- **DocumentiUlia → WooCommerce**: Import produse și actualizări stoc
- **Bidirecțional**: Sincronizare automată în ambele direcții

### Sincronizare în Timp Real
- **Webhooks**: Actualizări instant prin webhooks
- **Cron Jobs**: Sincronizare programată (la fiecare 5 minute implicit)
- **Manual**: Butoane pentru sincronizare manuală

### Monitorizare și Log-uri
- **Dashboard Widget**: Status sincronizare în WordPress Dashboard
- **Log-uri Detaliate**: Istoric complet al sincronizărilor
- **Alerte**: Notificări pentru erori de sincronizare

## 🚀 Instalare

### Cerințe Minime
- WordPress 5.8+
- WooCommerce 5.0+
- PHP 7.4+
- DocumentiUlia API Key

### Pași Instalare

1. **Încărcați plugin-ul**
   - Descărcați plugin-ul ca fișier ZIP
   - În WordPress admin, navigați la Plugins → Add New
   - Faceți click pe "Upload Plugin" și selectați fișierul ZIP
   - Faceți click pe "Install Now"

2. **Activați plugin-ul**
   - După instalare, faceți click pe "Activate"

3. **Configurați conexiunea**
   - Navigați la DocumentiUlia → Setări
   - Introduceți API Key și API Secret din DocumentiUlia
   - Faceți click pe "Testează Conexiunea"

4. **Configurați sincronizarea**
   - Selectați depozitul implicit
   - Alegeți frecvența sincronizării
   - Configurați direcția sincronizării

5. **Sincronizare inițială**
   - În tab-ul "Sincronizare", faceți click pe "Sincronizare Inițială"
   - Așteptați finalizarea procesului

## ⚙️ Configurare

### Tab: Conexiune

#### API Settings
- **API URL**: `https://documentiulia.ro/api/v1` (implicit)
- **API Key**: Cheie API din DocumentiUlia
- **API Secret**: Secret API din DocumentiUlia
- **Webhook Secret**: Generat automat pentru securitate

#### Test Conexiune
Verificați dacă credențialele sunt corecte înainte de a activa sincronizarea.

### Tab: Sincronizare

#### Setări Sincronizare
- **Depozit Implicit**: Selectați depozitul din care să sincronizați stocul
- **Frecvență Sincronizare**:
  - La fiecare 5 minute (recomandat)
  - La fiecare 15 minute
  - La fiecare 30 minute
  - Orar
  - De două ori pe zi
  - Zilnic

- **Direcție Sincronizare**:
  - Bidirecțional (WooCommerce ↔ DocumentiUlia)
  - Doar spre DocumentiUlia (WooCommerce → DocumentiUlia)
  - Doar din DocumentiUlia (DocumentiUlia → WooCommerce)

#### Sincronizare Inițială
- **Sincronizare către DocumentiUlia**: Export toate produsele WooCommerce
- **Sincronizare din DocumentiUlia**: Import toate produsele DocumentiUlia

### Tab: Status

#### Monitorizare în Timp Real
- Status conexiune (Conectat/Deconectat)
- Număr sincronizări ultimele 24h
- Ultima sincronizare reușită
- Erori recente

### Tab: Log-uri

#### Istoric Sincronizări
- Vizualizați toate sincronizările
- Filtrare pe tip (Produs, Stoc, Comandă, Webhook)
- Filtrare pe status (Succes, Eroare, Omis)
- Paginare (100 intrări per pagină)
- Opțiune ștergere log-uri vechi

## 🔧 Funcționare Tehnică

### Fluxul de Sincronizare

#### 1. Sincronizare Produse (WooCommerce → DocumentiUlia)

```
Eveniment: Produs actualizat în WooCommerce
    ↓
Plugin detectează modificarea
    ↓
Verifică dacă produsul există în DocumentiUlia (după SKU)
    ↓
    ├─ Există → UPDATE produs în DocumentiUlia
    └─ Nu există → CREATE produs nou în DocumentiUlia
    ↓
Salvează ID DocumentiUlia în WooCommerce (meta)
    ↓
Log sincronizare
```

#### 2. Sincronizare Stoc (Bidirecțional)

**WooCommerce → DocumentiUlia:**
```
Eveniment: Stoc modificat în WooCommerce
    ↓
Plugin detectează modificarea
    ↓
Trimite nivel stoc nou către DocumentiUlia API
    ↓
DocumentiUlia actualizează inventarul
    ↓
Log sincronizare
```

**DocumentiUlia → WooCommerce (Webhook):**
```
Stoc modificat în DocumentiUlia
    ↓
DocumentiUlia trimite webhook către WooCommerce
    ↓
Plugin verifică semnătura webhook (securitate)
    ↓
Actualizează stoc în WooCommerce după SKU
    ↓
Log sincronizare
```

#### 3. Sincronizare Comenzi (WooCommerce → DocumentiUlia)

```
Eveniment: Comandă nouă în WooCommerce
    ↓
Plugin extrage date comandă
    ↓
Creează factură în DocumentiUlia prin API
    ↓
Salvează ID factură în comandă WooCommerce
    ↓
La plată primită în DocumentiUlia
    ↓
Webhook actualizează status comandă WooCommerce
```

### Evenimente WooCommerce Monitorizate

```php
// Stoc modificat
woocommerce_product_set_stock
woocommerce_variation_set_stock

// Comandă nouă
woocommerce_new_order

// Produs actualizat
woocommerce_update_product
```

### Cron Jobs Programate

```php
// Sincronizare stoc din DocumentiUlia
documentiulia_sync_stock (la fiecare 5 minute)

// Sincronizare produse complete
documentiulia_sync_products (orar)
```

### Webhook Endpoints

Plugin-ul expune următoarele endpoint-uri REST API:

```
POST /wp-json/documentiulia/v1/webhook/stock-update
POST /wp-json/documentiulia/v1/webhook/product-update
POST /wp-json/documentiulia/v1/webhook/invoice-status
POST /wp-json/documentiulia/v1/webhook/payment-received
```

**Securitate:** Toate webhook-urile necesită semnătura HMAC-SHA256.

## 📊 Structura Bazei de Date

### Tabel: `wp_documentiulia_sync_log`

```sql
CREATE TABLE wp_documentiulia_sync_log (
    id bigint(20) AUTO_INCREMENT PRIMARY KEY,
    product_id bigint(20) NOT NULL,      -- ID produs/comandă WooCommerce
    sync_type varchar(50) NOT NULL,      -- 'product', 'stock', 'order', 'webhook'
    direction varchar(20) NOT NULL,      -- 'to_documentiulia', 'from_documentiulia'
    status varchar(20) NOT NULL,         -- 'success', 'error', 'skipped'
    message text,                        -- Mesaj detaliat
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    INDEX (product_id),
    INDEX (sync_type),
    INDEX (created_at)
);
```

### Meta Fields (Post Meta)

Pentru fiecare produs WooCommerce:
```php
_documentiulia_product_id   // UUID produs în DocumentiUlia
_documentiulia_last_sync    // Timestamp ultima sincronizare
_barcode                    // Cod de bare (sincronizat cu DocumentiUlia)
```

Pentru fiecare comandă WooCommerce:
```php
_documentiulia_invoice_id   // UUID factură în DocumentiUlia
_documentiulia_last_sync    // Timestamp ultima sincronizare
```

## 🛠️ Rezolvare Probleme

### Conexiunea eșuează

**Problemă:** "Nu s-a putut conecta la DocumentiUlia API"

**Soluții:**
1. Verificați API Key și API Secret
2. Asigurați-vă că site-ul poate face request-uri externe (verificați firewall)
3. Verificați SSL certificate (DocumentiUlia folosește HTTPS)
4. Verificați dacă API URL este corect: `https://documentiulia.ro/api/v1`

### Sincronizarea nu funcționează

**Problemă:** Produsele nu se sincronizează automat

**Soluții:**
1. Verificați dacă "Activare Sincronizare" este activată în setări
2. Verificați dacă WP Cron funcționează: `wp cron event list`
3. Verificați log-urile pentru erori specifice
4. Testați sincronizare manuală pentru a izola problema

### Produse duplicate

**Problemă:** Același produs apare de două ori după sincronizare

**Soluții:**
1. Asigurați-vă că toate produsele au SKU unic
2. SKU-ul este folosit ca identificator pentru matching
3. Rulați sincronizare inițială doar o dată
4. Verificați log-urile pentru a identifica duplicările

### Webhook-uri nu funcționează

**Problemă:** Actualizările din DocumentiUlia nu ajung în WooCommerce

**Soluții:**
1. Verificați dacă Webhook Secret este configurat corect în ambele sisteme
2. Testați endpoint-ul webhook manual cu curl/Postman
3. Verificați log-urile server (nginx/Apache) pentru erori 403/500
4. Asigurați-vă că permalink-urile sunt activate în WordPress

### Performance Issues

**Problemă:** Sincronizarea este lentă cu multe produse

**Soluții:**
1. Creșteți frecvența sincronizării (ex: la fiecare 15 minute în loc de 5)
2. Folosiți sincronizare unidirecțională în loc de bidirecțională
3. Creșteți PHP `max_execution_time` pentru sincronizări mari
4. Activați cache-ul Redis/Memcached în WordPress
5. Folosiți sincronizare programată (cron) în loc de sincronizare instant

## 📝 Dezvoltare și Extensii

### Structura Fișierelor

```
documentiulia-woocommerce/
├── documentiulia-woocommerce.php    # Plugin principal
├── includes/
│   ├── class-api-client.php         # Client API DocumentiUlia
│   ├── class-settings.php           # Management setări
│   ├── class-product-sync.php       # Sincronizare produse
│   ├── class-stock-sync.php         # Sincronizare stoc
│   ├── class-order-sync.php         # Sincronizare comenzi
│   └── class-webhook-handler.php    # Handler webhook-uri
├── admin/
│   ├── class-admin.php              # Admin initialization
│   ├── class-settings-page.php      # Pagină setări
│   └── class-sync-dashboard.php     # Widget dashboard
├── assets/
│   ├── css/
│   │   └── admin.css                # Stiluri admin
│   └── js/
│       └── admin.js                 # JavaScript admin
├── languages/                        # Traduceri
└── README.md                         # Această documentație
```

### Filtre și Acțiuni Disponibile

#### Filtre

```php
// Modificare date produs înainte de sincronizare
apply_filters('documentiulia_wc_product_data', $product_data, $product);

// Modificare date comandă înainte de sincronizare
apply_filters('documentiulia_wc_order_data', $order_data, $order);

// Modificare frecvență sincronizare
apply_filters('documentiulia_wc_sync_frequency', $frequency);
```

#### Acțiuni

```php
// După sincronizare produs reușită
do_action('documentiulia_wc_product_synced', $product_id, $response);

// După sincronizare stoc reușită
do_action('documentiulia_wc_stock_synced', $product_id, $quantity);

// După sincronizare comandă reușită
do_action('documentiulia_wc_order_synced', $order_id, $invoice_id);

// După primire webhook
do_action('documentiulia_wc_webhook_received', $webhook_type, $data);
```

### Exemplu: Sincronizare Categorie Personalizată

```php
add_filter('documentiulia_wc_product_data', function($product_data, $product) {
    // Adaugă categorie personalizată
    $custom_category = get_post_meta($product->get_id(), '_custom_category', true);

    if ($custom_category) {
        $product_data['custom_category'] = $custom_category;
    }

    return $product_data;
}, 10, 2);
```

## 📞 Suport

### Documentație
- **DocumentiUlia Docs**: https://documentiulia.ro/docs
- **API Documentation**: https://documentiulia.ro/docs/api

### Contacte
- **Email Suport**: support@documentiulia.ro
- **Telefon**: +40 XXX XXX XXX
- **Chat Live**: Disponibil în platforma DocumentiUlia

### Raportare Bug-uri
Raportați bug-uri prin:
1. Email la support@documentiulia.ro
2. Dashboard DocumentiUlia → Suport → Raportare Problemă

## 📄 Licență

GPL v2 sau mai recentă

---

**© 2025 DocumentiUlia. Toate drepturile rezervate.**
