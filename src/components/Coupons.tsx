import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Search, Tag, Calendar, Percent, DollarSign, Users, RefreshCw } from 'lucide-react';
import WooCommerceService, { WooCommerceServer } from '../services/woocommerce';
import StoreSelector from './StoreSelector';
import CreateCouponModal from './CreateCouponModal';
import axios from 'axios';

interface Coupon {
  id: number;
  code: string;
  amount: string;
  discount_type: string;
  description: string;
  date_expires?: string;
  usage_count: number;
  usage_limit?: number;
  individual_use: boolean;
  store?: {
    id: string;
    name: string;
  };
}

interface LoadingProgress {
  total: number;
  current: number;
  store: string;
}

const Coupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({ total: 0, current: 0, store: '' });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [servers, setServers] = useState<WooCommerceServer[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const allServers = WooCommerceService.getServers();
    setServers(allServers);
    setSelectedServers(allServers.filter(s => s.status === 'online').map(s => s.id));
  }, []);

  useEffect(() => {
    if (selectedServers.length > 0) {
      fetchCoupons();
    }
  }, [selectedServers]);

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    setLoadingProgress({ total: selectedServers.length, current: 0, store: '' });
    setCoupons([]);

    try {
      setLoadingStatus('Connecting to stores...');
      const couponPromises = selectedServers.map(async (serverId, index) => {
        const server = servers.find(s => s.id === serverId);
        if (!server) return [];

        try {
          setLoadingProgress(prev => ({
            ...prev,
            current: index,
            store: server.name
          }));
          setLoadingStatus(`Fetching coupons from ${server.name}...`);

          const response = await axios.get(`${server.url}/wp-json/wc/v3/coupons`, {
            auth: {
              username: server.consumerKey,
              password: server.consumerSecret
            },
            params: {
              per_page: 100,
              search: searchTerm
            }
          });

          return response.data.map((coupon: Coupon) => ({
            ...coupon,
            store: {
              id: server.id,
              name: server.name
            }
          }));
        } catch (error) {
          console.error(`Error fetching coupons from ${server.name}:`, error);
          return [];
        }
      });

      setLoadingStatus('Processing coupon data...');
      const allCouponsArrays = await Promise.all(couponPromises);
      const allCoupons = allCouponsArrays.flat();
      setCoupons(allCoupons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCoupons();
  };

  const getProgressPercentage = () => {
    if (loadingProgress.total === 0) return 0;
    return Math.round((loadingProgress.current / loadingProgress.total) * 100);
  };

  const getDiscountLabel = (coupon: Coupon) => {
    switch (coupon.discount_type) {
      case 'percent':
        return `${coupon.amount}% off`;
      case 'fixed_cart':
        return `$${coupon.amount} off cart`;
      case 'fixed_product':
        return `$${coupon.amount} off product`;
      default:
        return `${coupon.amount} off`;
    }
  };

  const handleCouponCreated = () => {
    setShowCreateModal(false);
    fetchCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Coupons</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex-1 sm:flex-initial">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search coupons..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </form>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Coupon
          </button>
        </div>
      </div>

      <StoreSelector
        servers={servers}
        selectedServers={selectedServers}
        onSelectionChange={setSelectedServers}
      />

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

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="flex items-center justify-between w-full text-sm text-gray-500">
                <span>{loadingStatus}</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              {loadingProgress.store && (
                <p className="text-sm text-gray-600">
                  Store: {loadingProgress.store} ({loadingProgress.current + 1} of {loadingProgress.total})
                </p>
              )}
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div
            key={`${coupon.store?.id}-${coupon.id}`}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Tag className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">{coupon.code}</h3>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {getDiscountLabel(coupon)}
                </span>
              </div>

              {coupon.description && (
                <p className="text-sm text-gray-600 mb-4">{coupon.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Used {coupon.usage_count} times</span>
                  {coupon.usage_limit && (
                    <span className="ml-1">
                      (Limit: {coupon.usage_limit})
                    </span>
                  )}
                </div>

                {coupon.date_expires && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Expires: {new Date(coupon.date_expires).toLocaleDateString()}</span>
                  </div>
                )}

                {coupon.store && (
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>Store: {coupon.store.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && coupons.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No coupons found matching your search criteria.' : selectedServers.length === 0 ? 'Please select at least one store to view coupons.' : 'No coupons found.'}
        </div>
      )}

      {showCreateModal && (
        <CreateCouponModal
          servers={servers.filter(server => selectedServers.includes(server.id))}
          onClose={() => setShowCreateModal(false)}
          onCouponCreated={handleCouponCreated}
        />
      )}
    </div>
  );
};

export default Coupons;