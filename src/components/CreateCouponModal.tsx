import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { WooCommerceServer } from '../services/woocommerce';

interface CreateCouponModalProps {
  servers: WooCommerceServer[];
  onClose: () => void;
  onCouponCreated: () => void;
}

interface CouponData {
  code: string;
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
  amount: string;
  description?: string;
  individual_use: boolean;
  usage_limit?: number;
  date_expires?: string;
}

const CreateCouponModal: React.FC<CreateCouponModalProps> = ({ servers, onClose, onCouponCreated }) => {
  const [selectedServer, setSelectedServer] = useState(servers[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponData, setCouponData] = useState<CouponData>({
    code: '',
    discount_type: 'percent',
    amount: '',
    description: '',
    individual_use: false,
    usage_limit: undefined,
    date_expires: undefined
  });

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const server = servers.find(s => s.id === selectedServer);
      if (!server) {
        throw new Error('Please select a store');
      }

      const response = await axios.post(
        `${server.url}/wp-json/wc/v3/coupons`,
        couponData,
        {
          auth: {
            username: server.consumerKey,
            password: server.consumerSecret
          }
        }
      );

      if (response.data) {
        onCouponCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Create New Coupon</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <div className="flex">
                <AlertCircle className="h-6 w-6 text-red-500 mr-4" />
                <div>
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store
            </label>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              required
            >
              <option value="">Select a store</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Code
            </label>
            <input
              type="text"
              value={couponData.code}
              onChange={(e) => setCouponData({ ...couponData, code: e.target.value.toUpperCase() })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Type
              </label>
              <select
                value={couponData.discount_type}
                onChange={(e) => setCouponData({ ...couponData, discount_type: e.target.value as CouponData['discount_type'] })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                required
              >
                <option value="percent">Percentage discount</option>
                <option value="fixed_cart">Fixed cart discount</option>
                <option value="fixed_product">Fixed product discount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={couponData.amount}
                onChange={(e) => setCouponData({ ...couponData, amount: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={couponData.description}
              onChange={(e) => setCouponData({ ...couponData, description: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usage Limit
              </label>
              <input
                type="number"
                value={couponData.usage_limit || ''}
                onChange={(e) => setCouponData({ ...couponData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                value={couponData.date_expires?.split('T')[0] || ''}
                onChange={(e) => setCouponData({ ...couponData, date_expires: e.target.value ? `${e.target.value}T23:59:59` : undefined })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="individual_use"
              checked={couponData.individual_use}
              onChange={(e) => setCouponData({ ...couponData, individual_use: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="individual_use" className="ml-2 block text-sm text-gray-700">
              Individual use only
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCouponModal;