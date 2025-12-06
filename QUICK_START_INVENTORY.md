# 🚀 Quick Start Guide - Inventory Module

**Welcome to the DocumentiUlia.ro Inventory Management System!**

This guide will help you get started with managing your inventory in just a few minutes.

---

## 📋 Table of Contents

1. [First Login](#first-login)
2. [Setting Up Your First Warehouse](#setting-up-your-first-warehouse)
3. [Adding Products](#adding-products)
4. [Managing Stock Levels](#managing-stock-levels)
5. [Monitoring Alerts](#monitoring-alerts)
6. [Common Tasks](#common-tasks)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)

---

## 1. First Login

### Access the System

1. Navigate to **http://documentiulia.ro**
2. Click **"Login"** in the top right
3. Enter your credentials:
   - **Email**: your-email@company.com
   - **Password**: (your password)
4. Click **"Sign In"**

### Navigate to Inventory Module

After login, you'll see the main dashboard. Click on **"Inventory"** in the sidebar menu.

You'll land on the **Inventory Dashboard** which shows:
- 📦 Total Products
- 💰 Stock Value
- ⚠️ Low Stock Alerts
- 🏢 Active Warehouses

---

## 2. Setting Up Your First Warehouse

### Why You Need a Warehouse

Warehouses represent physical locations where you store inventory. You need at least one warehouse before you can track stock.

### Create a Warehouse

1. Go to **Inventory → Warehouses** (or click the "Depozite & Locații" card on dashboard)
2. Click **"Depozit Nou"** (New Warehouse) button
3. Fill in the form:
   - **Name**: Main Warehouse
   - **Code**: WH-001 (unique identifier)
   - **Type**: Select "Depozit" (Warehouse), "Magazin" (Store), or "Dropshipping"
   - **Address**: Street address
   - **City**: Your city
   - **County**: Your county/state
   - **Postal Code**: ZIP code
   - **Phone**: Contact number (optional)
   - **Email**: Contact email (optional)
   - ✅ **Active**: Check this box
   - ✅ **Sellable**: Check if this location can fulfill direct sales

4. Click **"Salvează"** (Save)

### Warehouse Types Explained

- **Depozit (Warehouse)**: Standard storage facility - no direct customer sales
- **Magazin (Store)**: Retail location - allows direct customer sales
- **Dropshipping**: Virtual location - products ship directly from supplier

---

## 3. Adding Products

### Navigate to Products

1. Go to **Inventory → Products** (or click "Catalog Produse" on dashboard)
2. Click **"Produs Nou"** (New Product)

### Fill Product Information

#### Basic Information
- **SKU**: Unique product code (e.g., LAPTOP-001)
- **Barcode**: EAN/UPC barcode (optional, for scanning)
- **Name**: Product name (e.g., "Dell Latitude 5420")
- **Category**: Select from dropdown or create new
- **Description**: Detailed product description

#### Pricing
- **Selling Price**: Customer-facing price (RON)
- **Purchase Price**: Your cost from supplier (RON)
- **Profit Margin**: Auto-calculated from selling - purchase price

#### Inventory Settings
- **Unit of Measure**: buc (pieces), kg, liter, etc.
- **Track Inventory**: ✅ Check to enable stock tracking
- **Reorder Level**: Minimum quantity before alert triggers

#### Tax & Accounting
- **Tax Rate**: VAT percentage (default 19%)
- **Accounting Code**: GL account code (optional)

3. Click **"Salvează"** (Save)

### Quick Tips for Products

✅ **DO:**
- Use consistent SKU naming (e.g., CAT-001, CAT-002)
- Add barcodes for faster checkout
- Set realistic reorder levels
- Include good product descriptions

❌ **DON'T:**
- Use duplicate SKUs
- Leave price fields empty
- Forget to activate the product (is_active checkbox)

---

## 4. Managing Stock Levels

### Initial Stock Entry

After creating products, you need to add initial inventory:

1. Go to **Inventory → Stock Levels**
2. Click on a product to expand warehouse details
3. For each warehouse, you'll see:
   - **Available**: Total quantity in warehouse
   - **Reserved**: Quantity allocated to orders
   - **Free**: Available - Reserved (auto-calculated)
   - **On Order**: Quantity incoming from suppliers

### Adjust Stock Manually

To correct stock levels:

1. Go to **Inventory → Adjustments** (coming soon in UI, use API for now)
2. Or use the **Stock Movement** feature to log changes

### Stock Movement Types

- **Receipt**: Receiving from supplier
- **Sale**: Fulfilling customer order
- **Adjustment**: Physical count correction
- **Transfer**: Moving between warehouses
- **Return**: Customer or supplier return
- **Damage**: Write-off damaged/lost items

---

## 5. Monitoring Alerts

### Low Stock Alerts

The system automatically monitors stock levels and creates alerts when products fall below reorder levels.

#### View Alerts

1. Go to **Inventory → Low Stock Alerts**
2. You'll see alerts grouped by status:
   - 🔴 **Active**: New alerts needing attention
   - 🟡 **Acknowledged**: You've seen them
   - 🔵 **Ordered**: Reorder placed
   - 🟢 **Resolved**: Stock replenished

#### Alert Details

Each alert shows:
- **Current Stock**: How many units left
- **Reorder Level**: Your threshold
- **Suggested Order Quantity**: Calculated recommendation
- **Days Out of Stock**: If quantity = 0
- **Estimated Lost Revenue**: Potential sales lost

#### Take Action

For each alert, you can:
1. **Acknowledge**: Mark as seen (status → acknowledged)
2. **Create Order**: Generate purchase order (status → ordered)
3. **Resolve**: Mark as handled (status → resolved)

### Alert Severity

- 🔴 **Critical**: Out of stock (quantity = 0)
- 🟡 **Warning**: Below reorder level
- 🟢 **Normal**: Stock healthy

---

## 6. Common Tasks

### Search for Products

1. Go to **Products** page
2. Use the search box to find by:
   - Product name
   - SKU
   - Barcode
3. Apply filters:
   - Category dropdown
   - "Doar stoc scăzut" checkbox (show only low stock)
4. Click **"Resetează filtre"** to clear

### Transfer Stock Between Warehouses

1. Go to **Stock Transfers** (API only for now)
2. Create transfer:
   - **From Warehouse**: Source location
   - **To Warehouse**: Destination location
   - **Products**: Select items and quantities
   - **Reason**: Why you're transferring
3. Track status: Pending → In Transit → Completed

### View Stock by Warehouse

1. Go to **Stock Levels** page
2. Toggle view using the buttons:
   - **Pe Produs** (By Product): See all warehouses for one product
   - **Pe Depozit** (By Warehouse): See all products in one warehouse
3. Click any row to expand details

### Generate Reports

Currently available reports:
- **Inventory Valuation**: Total stock value
- **Low Stock Report**: Products needing reorder
- **Stock Movement History**: All transactions

Coming soon:
- ABC Analysis
- Aging Report
- Turnover Rate
- Dead Stock Report

---

## 7. Keyboard Shortcuts

Speed up your workflow with these shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Global search |
| `Ctrl + N` | New product (on Products page) |
| `Ctrl + F` | Focus search box |
| `Ctrl + /` | Show all shortcuts |
| `Esc` | Close modal/cancel |
| `Enter` | Submit form/confirm |

---

## 8. Troubleshooting

### Product Not Showing in Stock Levels

**Problem**: Created product but don't see it in Stock Levels page

**Solution**:
1. Ensure product has `Track Inventory` enabled
2. Add initial stock entry for at least one warehouse
3. Check that product is active (is_active = true)

### Low Stock Alert Not Triggering

**Problem**: Stock is below reorder level but no alert

**Solution**:
1. Verify reorder level is set on product
2. Check that stock_levels table has reorder_level value
3. Ensure trigger `check_low_stock()` is enabled on database

### Can't Update Stock

**Problem**: Getting "Unauthorized" error

**Solution**:
1. Check that you're logged in
2. Verify your user role has inventory permissions
3. Try logging out and back in to refresh token

### Stock Numbers Don't Match

**Problem**: Frontend shows different numbers than expected

**Solution**:
1. Check **Stock Movements** for recent transactions
2. Verify no pending transfers
3. Run inventory reconciliation report
4. Contact support if discrepancy persists

### API Returns 401 Unauthorized

**Problem**: Getting 401 when calling inventory APIs

**Solution**:
```bash
# Get fresh token by logging in
curl -X POST http://documentiulia.ro/api/v1/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Use token in subsequent requests
curl http://documentiulia.ro/api/v1/inventory/products.php \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎯 Quick Reference

### Essential URLs

| Page | URL |
|------|-----|
| Dashboard | `/inventory` |
| Products | `/inventory/products` |
| Stock Levels | `/inventory/stock-levels` |
| Warehouses | `/inventory/warehouses` |
| Alerts | `/inventory/low-stock` |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/inventory/products.php` | GET, POST, PUT, DELETE | Product CRUD |
| `/api/v1/inventory/stock-levels.php` | GET | Real-time stock |
| `/api/v1/inventory/warehouses.php` | GET, POST, PUT, DELETE | Warehouse CRUD |
| `/api/v1/inventory/low-stock.php` | GET, PUT | Alerts |
| `/api/v1/inventory/stock-movement.php` | GET, POST | Movement log |
| `/api/v1/inventory/stock-adjustment.php` | GET, POST | Adjustments |
| `/api/v1/inventory/stock-transfer.php` | GET, POST, PUT | Transfers |

### Status Indicators

| Icon | Meaning |
|------|---------|
| 🟢 | In Stock (healthy) |
| 🟡 | Low Stock (below reorder level) |
| 🔴 | Out of Stock (quantity = 0) |
| ✅ | Active/Enabled |
| ❌ | Inactive/Disabled |
| ⚠️ | Warning/Attention Needed |

---

## 💡 Best Practices

### Daily Tasks
- [ ] Review low stock alerts (morning)
- [ ] Process incoming receipts
- [ ] Update stock for completed sales
- [ ] Check pending transfers

### Weekly Tasks
- [ ] Reconcile physical inventory (spot check 10%)
- [ ] Review slow-moving items
- [ ] Update reorder levels based on demand
- [ ] Generate inventory valuation report

### Monthly Tasks
- [ ] Full inventory count (or cycle count)
- [ ] Review and adjust reorder points
- [ ] Analyze turnover rates
- [ ] Clean up inactive products
- [ ] Backup inventory data

---

## 📞 Need Help?

### Documentation
- **Full System Guide**: `/var/www/documentiulia.ro/INVENTORY_MODULE_STATUS.md`
- **Architecture**: `/var/www/documentiulia.ro/OBJECT_BASED_ONLINE_OFFICE_ARCHITECTURE.md`

### Support
- **Email**: support@documentiulia.ro
- **Phone**: +40 XXX XXX XXX
- **Live Chat**: Available Mon-Fri 9AM-6PM

### Training
- **Video Tutorials**: Coming soon
- **Webinars**: Monthly training sessions
- **FAQ**: https://documentiulia.ro/help/inventory

---

## 🎉 You're Ready!

Congratulations! You now know the basics of the inventory module. Start with:

1. ✅ Create your first warehouse
2. ✅ Add 3-5 test products
3. ✅ Enter initial stock quantities
4. ✅ Set reorder levels
5. ✅ Monitor the dashboard

**Questions?** Contact support or check the documentation.

**Happy Inventory Managing!** 📦

---

*Last Updated: 2025-11-16*
*Version: 1.0.0*
