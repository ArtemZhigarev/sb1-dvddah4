import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Package, ArrowUpDown, Search } from 'lucide-react';
import WooCommerceService, { WooCommerceServer } from '../services/woocommerce';
import ProductDetails from './ProductDetails';
import StoreSelector from './StoreSelector';

interface Product {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  stock_status: string;
  description: string;
  short_description: string;
  sku: string;
  permalink: string;
  categories: Array<{
    id: number;
    name: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  store?: {
    id: string;
    name: string;
    url: string;
  };
  attributes?: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
}

interface LoadingProgress {
  total: number;
  current: number;
  store: string;
  status: string;
}

const AllProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortField, setSortField] = useState<'name' | 'price'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [servers, setServers] = useState<WooCommerceServer[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    total: 0,
    current: 0,
    store: '',
    status: 'Initializing...'
  });

  useEffect(() => {
    const allServers = WooCommerceService.getServers();
    setServers(allServers);
    setSelectedServers(allServers.filter(s => s.status === 'online').map(s => s.id));
  }, []);

  useEffect(() => {
    if (selectedServers.length > 0) {
      setProducts([]);
      setPage(1);
      fetchProducts();
    }
  }, [selectedServers]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    setLoadingProgress({
      total: selectedServers.length,
      current: 0,
      store: '',
      status: 'Connecting to stores...'
    });

    try {
      const productPromises = selectedServers.map(async (serverId, index) => {
        const server = servers.find(s => s.id === serverId);
        if (!server) return [];

        try {
          setLoadingProgress(prev => ({
            ...prev,
            current: index,
            store: server.name,
            status: `Fetching products from ${server.name}...`
          }));

          const response = await axios.get(`${server.url}/wp-json/wc/v3/products`, {
            auth: {
              username: server.consumerKey,
              password: server.consumerSecret
            },
            params: {
              per_page: 20,
              page,
              search: searchTerm
            }
          });

          return response.data.map((product: Product) => ({
            ...product,
            store: {
              id: server.id,
              name: server.name,
              url: server.url
            }
          }));
        } catch (error) {
          console.error(`Error fetching products from ${server.name}:`, error);
          return [];
        }
      });

      setLoadingProgress(prev => ({
        ...prev,
        status: 'Processing product data...'
      }));

      const allProductsArrays = await Promise.all(productPromises);
      const allProducts = allProductsArrays.flat();

      setProducts(prevProducts => {
        const newProducts = allProducts.filter((newProduct: Product) => 
          !prevProducts.some(existingProduct => 
            existingProduct.id === newProduct.id && existingProduct.store?.id === newProduct.store?.id
          )
        );
        return [...prevProducts, ...newProducts];
      });
      setHasMore(allProducts.length === selectedServers.length * 20);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: 'name' | 'price') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setProducts([]);
    setPage(1);
    fetchProducts();
  };

  const getProgressPercentage = () => {
    if (loadingProgress.total === 0) return 0;
    return Math.round((loadingProgress.current / loadingProgress.total) * 100);
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      const priceA = parseFloat(a.price || '0');
      const priceB = parseFloat(b.price || '0');
      return sortDirection === 'asc' ? priceA - priceB : priceB - priceA;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">All Products</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex-1 sm:flex-initial">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </form>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSort('name')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                sortField === 'name' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              } hover:bg-blue-50`}
            >
              Name
              <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'name' ? 'text-blue-800' : 'text-gray-500'}`} />
            </button>
            <button
              onClick={() => handleSort('price')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                sortField === 'price' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              } hover:bg-blue-50`}
            >
              Price
              <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'price' ? 'text-blue-800' : 'text-gray-500'}`} />
            </button>
          </div>
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
                <span>{loadingProgress.status}</span>
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
        {sortedProducts.map((product) => (
          <div
            key={`${product.store?.id}-${product.id}`}
            onClick={() => setSelectedProduct(product)}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
          >
            {product.images?.[0] && (
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={product.images[0].src}
                  alt={product.images[0].alt || product.name}
                  className="object-cover w-full h-48"
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  ${parseFloat(product.price || '0').toFixed(2)}
                </span>
              </div>
              {product.short_description && (
                <p className="text-sm text-gray-600 mb-4" 
                   dangerouslySetInnerHTML={{ __html: product.short_description }} />
              )}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>SKU: {product.sku}</span>
                <span>{product.store?.name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && sortedProducts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No products found matching your search criteria.' : selectedServers.length === 0 ? 'Please select at least one store to view products.' : 'No products found.'}
        </div>
      )}

      {hasMore && !loading && products.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setPage(prevPage => prevPage + 1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Load More
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default AllProducts;