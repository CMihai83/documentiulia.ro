/**
 * Purchase Order Service
 *
 * TypeScript service for Purchase Orders API integration
 * Provides type-safe methods for all PO operations
 *
 * @version 1.0
 * @date 2025-11-18
 */

import api from '../api';

// =====================================================
// TypeScript Interfaces
// =====================================================

export interface PurchaseOrder {
  id: string;
  company_id: string;
  po_number: string;
  reference_number?: string;

  // Vendor Information
  vendor_id?: string;
  vendor_name: string;
  vendor_email?: string;
  vendor_phone?: string;
  vendor_address?: string;

  // Quotation Link
  quotation_id?: string;

  // Financial Information
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;

  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'partially_received' | 'received' | 'cancelled';

  // Approval Workflow
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_by_name?: string;
  rejected_at?: string;
  rejection_reason?: string;

  // Dates
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;

  // Additional Info
  notes?: string;
  terms_and_conditions?: string;
  payment_terms?: string;
  delivery_address?: string;

  // Metadata
  created_by: string;
  created_by_name?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Aggregated Info
  items_count?: number;
  total_quantity?: number;
  total_received?: number;

  // Items (when fetching single PO)
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;

  // Product Information
  product_id?: string;
  product_name: string;
  product_code?: string;
  description?: string;

  // Quantity and Pricing
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;

  // Calculated Fields
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;

  // Receiving Status
  quantity_received: number;
  quantity_pending: number;

  // Metadata
  sort_order: number;
  created_at: string;
  updated_at: string;

  // Receipts (when fetching single PO)
  receipts?: PurchaseOrderReceipt[];
}

export interface PurchaseOrderReceipt {
  id: string;
  company_id: string;
  purchase_order_id: string;
  purchase_order_item_id: string;

  receipt_number: string;
  receipt_date: string;

  quantity_received: number;
  quality_status: 'accepted' | 'rejected' | 'partial';
  quantity_accepted: number;
  quantity_rejected: number;
  rejection_reason?: string;

  warehouse_id?: string;
  location?: string;
  notes?: string;

  received_by: string;
  received_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderFilters {
  status?: string;
  vendor_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

export interface CreatePurchaseOrderData {
  reference_number?: string;
  vendor_id?: string;
  vendor_name: string;
  vendor_email?: string;
  vendor_phone?: string;
  vendor_address?: string;
  quotation_id?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency?: string;
  status?: string;
  order_date: string;
  expected_delivery_date?: string;
  notes?: string;
  terms_and_conditions?: string;
  payment_terms?: string;
  delivery_address?: string;
  items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at' | 'updated_at' | 'subtotal' | 'tax_amount' | 'discount_amount' | 'total_amount' | 'quantity_received' | 'quantity_pending'>[];
}

export interface ReceiveGoodsData {
  purchase_order_item_id: string;
  quantity_received: number;
  quality_status?: 'accepted' | 'rejected' | 'partial';
  quantity_accepted?: number;
  quantity_rejected?: number;
  rejection_reason?: string;
  warehouse_id?: string;
  location?: string;
  notes?: string;
  receipt_date?: string;
}

// =====================================================
// Service Class
// =====================================================

class PurchaseOrderService {
  /**
   * List all purchase orders with optional filters
   */
  async listPurchaseOrders(filters?: PurchaseOrderFilters): Promise<PurchaseOrder[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.vendor_id) params.append('vendor_id', filters.vendor_id);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/purchase-orders/purchase-orders.php?${params}`);
    return response.data.purchase_orders;
  }

  /**
   * Get single purchase order with items and receipts
   */
  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await api.get(`/purchase-orders/purchase-orders.php?id=${id}`);
    return response.data.purchase_order;
  }

  /**
   * Create new purchase order
   */
  async createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    const response = await api.post('/purchase-orders/purchase-orders.php', data);
    return response.data.purchase_order;
  }

  /**
   * Update existing purchase order
   */
  async updatePurchaseOrder(id: string, data: Partial<CreatePurchaseOrderData>): Promise<PurchaseOrder> {
    const response = await api.put('/purchase-orders/purchase-orders.php', { id, ...data });
    return response.data.purchase_order;
  }

  /**
   * Delete purchase order
   */
  async deletePurchaseOrder(id: string): Promise<void> {
    await api.delete('/purchase-orders/purchase-orders.php', { data: { id } });
  }

  /**
   * Approve purchase order
   */
  async approvePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await api.post('/purchase-orders/approve.php', { id });
    return response.data.purchase_order;
  }

  /**
   * Reject purchase order
   */
  async rejectPurchaseOrder(id: string, reason: string): Promise<PurchaseOrder> {
    const response = await api.post('/purchase-orders/reject.php', { id, reason });
    return response.data.purchase_order;
  }

  /**
   * Receive goods against purchase order item
   */
  async receiveGoods(data: ReceiveGoodsData): Promise<PurchaseOrder> {
    const response = await api.post('/purchase-orders/receive-goods.php', data);
    return response.data.purchase_order;
  }

  /**
   * Convert purchase order to invoice
   */
  async convertToInvoice(purchaseOrderId: string): Promise<{ purchase_order: PurchaseOrder; invoice_data: any }> {
    const response = await api.post('/purchase-orders/convert-to-invoice.php', { purchase_order_id: purchaseOrderId });
    return response.data;
  }

  /**
   * Get purchase order statistics
   */
  async getPurchaseOrderStats(): Promise<{
    total_pos: number;
    draft_count: number;
    pending_approval_count: number;
    approved_count: number;
    sent_count: number;
    received_count: number;
    total_value: number;
    currency: string;
  }> {
    // This would call a dedicated stats endpoint when available
    // For now, calculate from list data
    const allPOs = await this.listPurchaseOrders();

    const stats = {
      total_pos: allPOs.length,
      draft_count: allPOs.filter((po) => po.status === 'draft').length,
      pending_approval_count: allPOs.filter((po) => po.status === 'pending_approval').length,
      approved_count: allPOs.filter((po) => po.status === 'approved').length,
      sent_count: allPOs.filter((po) => po.status === 'sent').length,
      received_count: allPOs.filter((po) => po.status === 'received').length,
      total_value: allPOs.reduce((sum, po) => sum + po.total_amount, 0),
      currency: allPOs[0]?.currency || 'RON',
    };

    return stats;
  }
}

export default new PurchaseOrderService();
