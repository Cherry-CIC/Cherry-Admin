import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export interface ShippingEmailIssue {
  orderId: string;
  productName: string | null;
  sellerId: string | null;
  sellerEmailStatus: string | null;
  labelAttachmentStatus: string;
  labelAttachmentError: string | null;
  lastSellerEmailAttemptAt: string | null;
  shipmentId: string | null;
  trackingNumber: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You are not signed in');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? payload.message ?? 'Request failed');
  }
  return payload.data as T;
}

export const resendSellerEmail = (orderId: string) =>
  request(`/admin/shipping-email-issues/${orderId}/resend`, { method: 'POST' });

export interface AdminOrder {
  id: string;
  productName: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  status: string;
  shipmentStatus: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  sellerId: string;
  charityId: string;
  price: number;
  donation: number;
  status: string;
  moderationStatus: string | null;
  hasSales: boolean;
  updatedAt: string | null;
}

export interface AdminShipment {
  id: string;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  qrStatus: string;
  labelUrl: string | null;
  updatedAt: string;
}

export const getAdminOrders = () => request<AdminOrder[]>('/admin/orders');
export const getAdminUsers = () => request<AdminUser[]>('/admin/users');
export const getAdminProducts = () => request<AdminProduct[]>('/admin/products');
export const getAdminShipments = () => request<AdminShipment[]>('/admin/shipments');
