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
  Warehouse,
} from "lucide-react";
import { fetchProductById } from "@/lib/api";

export default function ProductViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
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

  if (loading) return <LoadingState />;
  if (!product) return <NotFoundState router={router} />;

  const sku = product.skus?.[0];
  const price = sku?.price;
  const inventory = sku?.inventory;

  return (
    <div className="max-w-7xl mx-auto">
      <Header product={product} id={id} sku={sku} router={router} />

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <MainContent product={product} />
        <Sidebar price={price} inventory={inventory} product={product} />
      </div>
    </div>
  );
}

function Header({ product, id, sku, router }: any) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/products")}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              {product.title}{" "}
              <span className="ml-3">
                <StatusBadge status={product.status} />
              </span>
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                <span>ID: {id}</span>
              </div>
              {sku && (
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  <span>SKU: {sku.sku_code}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/products/${id}/edit`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Product
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    ACTIVE: "bg-emerald-100 text-emerald-800",
    DRAFT: "bg-amber-100 text-amber-800",
    ARCHIVED: "bg-slate-100 text-slate-800",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        colors[status] || colors.DRAFT
      }`}
    >
      {status}
    </span>
  );
}

function MainContent({ product }: any) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <Card title="Product Images" icon={Package}>
        {product.media?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {product.media.map((img: any) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.alt_text || product.title}
                className="aspect-square object-cover rounded-lg w-full"
              />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No images available</p>
        )}
      </Card>

      {product.description_html && (
        <Card title="Description">
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: product.description_html }}
          />
        </Card>
      )}
    </div>
  );
}

function Sidebar({ price, inventory, product }: any) {
  const discount =
    price?.compare_at_price && price?.sale_price
      ? Math.round((1 - price.sale_price / price.compare_at_price) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Card title="Pricing" icon={Tag}>
        <InfoRow
          label="Sale Price"
          value={`₹${price?.sale_price?.toLocaleString() || 0}`}
          bold
        />
        <InfoRow
          label="Compare at Price"
          value={
            price?.compare_at_price
              ? `₹${price.compare_at_price.toLocaleString()}`
              : "—"
          }
          strikethrough
        />
        {discount > 0 && (
          <InfoRow
            label="Discount"
            value={`${discount}% OFF`}
            className="text-emerald-600"
          />
        )}
      </Card>

      <Card title="Inventory" icon={Database}>
        <InfoRow
          label="Available Stock"
          value={`${inventory?.qty_on_hand || 0} units`}
          className={getStockColor(inventory?.qty_on_hand)}
          bold
        />
        <InfoRow
          label="Reserved Stock"
          value={`${inventory?.qty_reserved || 0} units`}
        />
        {inventory?.warehouse && (
          <InfoRow
            label="Warehouse"
            value={
              <div className="text-right">
                <div>{inventory.warehouse.name}</div>
                <div className="text-sm text-slate-500">
                  ({inventory.warehouse.code})
                </div>
              </div>
            }
          />
        )}
      </Card>

      <Card title="Product Details" icon={Layers}>
        <InfoRow label="Brand" value={product.brand?.name || "—"} />
        <div className="mt-3">
          <p className="text-sm text-slate-500 mb-2">Categories</p>
          <div className="flex flex-wrap gap-2">
            {product.categories?.map((cat: any) => (
              <span
                key={cat.id}
                className="bg-slate-100 px-3 py-1 rounded text-sm"
              >
                {cat.name}
              </span>
            ))}
          </div>
        </div>
        <InfoRow
          label="SKU Variants"
          value={`${product.skusCount || 1} variant(s)`}
        />
        <InfoRow
          label="Created"
          value={new Date(product.createdAt).toLocaleDateString("en-IN", {
            dateStyle: "medium",
          })}
          icon={Calendar}
        />
      </Card>
    </div>
  );
}

function Card({ title, children, icon: Icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-slate-500" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  bold,
  strikethrough,
  className = "",
  icon: Icon,
}: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-slate-600">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
      <span
        className={`${bold ? "font-bold" : ""} ${
          strikethrough ? "line-through text-slate-500" : ""
        } ${className}`}
      >
        {value}
      </span>
    </div>
  );
}

function getStockColor(qty: number) {
  if (!qty) return "text-red-600";
  if (qty > 10) return "text-emerald-600";
  if (qty > 0) return "text-amber-600";
  return "text-red-600";
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
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold mb-4">Product not found</h2>
      <p className="text-slate-600 mb-6">
        The requested product does not exist.
      </p>
      <button
        onClick={() => router.push("/products")}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Back to Products
      </button>
    </div>
  );
}
