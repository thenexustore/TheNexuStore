"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Package,
  Tag,
  Database,
  Layers,
  Calendar,
  Hash,
  Star,
  Box,
  Image as ImageIcon,
  Grid,
  Check,
  AlertCircle,
  TrendingDown,
  Settings,
  Copy,
} from "lucide-react";
import {
  fetchProductById,
  toggleFeatured,
  type Product,
} from "@/lib/api/products";
import { formatCurrency } from "@/lib/currency";

export default function ProductViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const data = await fetchProductById(id as string);
      setProduct(data);
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeatured = async () => {
    if (!product) return;
    try {
      await toggleFeatured(product.id);
      loadProduct();
    } catch (error) {
      console.error("Failed to toggle featured:", error);
    }
  };

  if (loading) return <LoadingState />;
  if (!product) return <NotFoundState router={router} />;

  return (
    <div className="max-w-7xl mx-auto">
      <Header
        product={product}
        id={id as string}
        router={router}
        onToggleFeatured={handleToggleFeatured}
      />

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <MainContent product={product} />
        <Sidebar product={product} />
      </div>
    </div>
  );
}

function Header({ product, id, router, onToggleFeatured }: any) {
  const brandName =
    typeof product.brand === "object" ? product.brand.name : product.brand;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/products")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {product.title}
              </h1>
              {product.featured_product && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 rounded-full text-sm font-semibold border border-amber-200">
                  <Star className="w-3 h-3 fill-amber-700" />
                  Featured
                </span>
              )}
              <StatusBadge status={product.product_status} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                <span className="font-mono">{product.sku_code}</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                <span>{brandName || "No Brand"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Box className="w-4 h-4" />
                <span>{product.stock_quantity} in stock</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onToggleFeatured}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
              product.featured_product
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                product.featured_product ? "fill-amber-700" : ""
              }`}
            />
            {product.featured_product ? "Remove Featured" : "Mark Featured"}
          </button>
          <button
            onClick={() => router.push(`/products/${product.id}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Product
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
    DRAFT: "bg-amber-50 text-amber-700 border-amber-100",
    ARCHIVED: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium border ${
        colors[status] || colors.DRAFT
      }`}
    >
      {status}
    </span>
  );
}

function StockStatusBadge({ status }: { status: string }) {
  const colors: any = {
    IN_STOCK: "bg-emerald-50 text-emerald-700 border-emerald-100",
    OUT_OF_STOCK: "bg-red-50 text-red-700 border-red-100",
    LOW_STOCK: "bg-amber-50 text-amber-700 border-amber-100",
    PREORDER: "bg-blue-50 text-blue-700 border-blue-100",
  };

  const icons: any = {
    IN_STOCK: <Check className="w-3 h-3" />,
    OUT_OF_STOCK: <AlertCircle className="w-3 h-3" />,
    LOW_STOCK: <TrendingDown className="w-3 h-3" />,
    PREORDER: <Calendar className="w-3 h-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
        colors[status] || colors.IN_STOCK
      }`}
    >
      {icons[status]}
      {status.replace("_", " ")}
    </span>
  );
}

function MainContent({ product }: { product: Product }) {
  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Product Images */}
      <Card title="Product Images" icon={ImageIcon}>
        {product.product_images?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {product.product_images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img.url}
                  alt={img.alt_text || product.title}
                  className="aspect-square object-cover rounded-lg w-full border border-slate-200"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No images available</p>
        )}
      </Card>

      {/* Description */}
      <Card title="Description" icon={Package}>
        {product.product_description ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: product.product_description,
            }}
          />
        ) : (
          <p className="text-slate-500 italic">No description provided</p>
        )}

        {product.short_description && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-1">
              Short Description:
            </p>
            <p className="text-slate-600">{product.short_description}</p>
          </div>
        )}
      </Card>

      {/* Variants */}
      {product.variants?.length > 0 && (
        <Card title="Product Variants" icon={Layers}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-left text-sm text-slate-600">
                    SKU
                  </th>
                  <th className="py-3 px-4 text-left text-sm text-slate-600">
                    Price
                  </th>
                  <th className="py-3 px-4 text-left text-sm text-slate-600">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id} className="border-b">
                    <td className="py-3 px-4 font-mono text-sm">
                      {variant.sku_code}
                    </td>
                    <td className="py-3 px-4">
                      {formatCurrency(variant.price)}
                    </td>
                    <td className="py-3 px-4">
                      {variant.stock_quantity} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Sidebar({ product }: { product: Product }) {
  const brandName = product.brand?.name || "No Brand";
  const categoryName = product.category?.name || "Uncategorized";
  const discount =
    product.discount_price && product.discount_price > product.price
      ? Math.round(
          ((product.discount_price - product.price) / product.discount_price) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <Card title="Pricing & Inventory" icon={Tag}>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Sale Price</span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(product.price)}
            </span>
          </div>
          {product.discount_price && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Compare at Price</span>
                <span className="text-lg text-slate-400 line-through">
                  {formatCurrency(product.discount_price)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Discount</span>
                  <span className="text-lg font-semibold text-emerald-600">
                    {discount}% OFF
                  </span>
                </div>
              )}
            </>
          )}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Stock Status</span>
              <StockStatusBadge status={product.stock_status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Available Quantity</span>
              <span
                className={`text-lg font-bold ${
                  product.stock_quantity > 10
                    ? "text-emerald-600"
                    : product.stock_quantity > 0
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {product.stock_quantity} units
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Categories" icon={Grid}>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-500 mb-2">Primary Category</p>
            <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
              {categoryName || "Uncategorized"}
            </span>
          </div>
          {product.categories && product.categories.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 mb-2">Other Categories</p>
              <div className="flex flex-wrap gap-2">
                {product.categories.map((cat, idx) => {
                  const catName = typeof cat === "object" ? cat.name : cat;
                  return (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-sm"
                    >
                      {catName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Product Information" icon={Database}>
        <InfoRow label="Brand" value={brandName || "No Brand"} />
        <InfoRow
          label="Created"
          value={new Date(product.created_at).toLocaleString("es-ES", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          icon={Calendar}
        />
        <InfoRow
          label="Product Status"
          value={<StatusBadge status={product.product_status} />}
        />
        <InfoRow
          label="Featured Product"
          value={product.featured_product ? "Yes" : "No"}
        />
      </Card>
    </div>
  );
}

function Card({ title, children, icon: Icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
        {Icon && <Icon className="w-5 h-5 text-slate-500" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-slate-600">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
      <div className="text-right">
        {typeof value === "string" || typeof value === "number" ? (
          <span className="font-medium text-slate-900">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8"></div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-80 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-60 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
        <div className="space-y-6">
          <div className="h-52 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-52 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-52 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

function NotFoundState({ router }: any) {
  return (
    <div className="max-w-7xl mx-auto py-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-400 rounded-full mb-6">
        <Package className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">
        Product not found
      </h2>
      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        The requested product does not exist or has been removed.
      </p>
      <button
        onClick={() => router.push("/products")}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Back to Products
      </button>
    </div>
  );
}
