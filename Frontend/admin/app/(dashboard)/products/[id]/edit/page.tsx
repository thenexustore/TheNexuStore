"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchAdminData, putAdminData } from "@/lib/api";

const Select = dynamic(() => import("react-select"), { ssr: false });

export default function ProductEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [imageError, setImageError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    brandId: "",
    sale_price: 0,
    compare_at_price: 0,
    qty_on_hand: 0,
    categories: [] as string[],
    images: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      fetchAdminData(`products/${id}`),
      fetchAdminData("brands"),
      fetchAdminData("categories"),
    ]).then(([product, brands, categories]) => {
      setBrands(brands);
      setCategories(categories);

      setFormData({
        title: product.title,
        description: product.description_html || "",
        brandId: product.brand_id,
        sale_price: Number(product.skus?.[0]?.prices?.[0]?.sale_price || 0),
        compare_at_price: Number(
          product.skus?.[0]?.prices?.[0]?.compare_at_price || 0
        ),
        qty_on_hand: Number(
          product.skus?.[0]?.inventory?.[0]?.qty_on_hand || 0
        ),
        categories: product.categories.map((c: any) => c.id),
        images: product.media.map((m: any) => m.url),
      });
    });
  }, [id]);

  const convertToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      const img = new Image();

      reader.onload = () => (img.src = reader.result as string);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 800 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        const size = Math.ceil((base64.length * 3) / 4);

        size > 1024 * 1024 ? reject("Image > 1MB") : resolve(base64);
      };

      reader.readAsDataURL(file);
    });

  const handleImagesSelect = async (e: any) => {
    try {
      const files = Array.from(e.target.files || []);
      const imgs = await Promise.all(files.map(convertToBase64));
      setFormData((p) => ({ ...p, images: [...p.images, ...imgs] }));
    } catch (err: any) {
      setImageError(err);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    await putAdminData(`products/${id}`, {
      title: formData.title,
      brandId: formData.brandId,
      description_html: formData.description,
      short_description: formData.description.slice(0, 200),
      sale_price: formData.sale_price,
      compare_at_price: formData.compare_at_price,
      qty_on_hand: formData.qty_on_hand,
      categories: formData.categories,
      images_base64: formData.images,
    });

    router.push(`/products/${id}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

      <form onSubmit={handleSubmit} className="bg-white border rounded p-6 grid gap-4">
        <input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="px-3 py-2 border rounded"
          placeholder="Title"
        />

        <select
          value={formData.brandId}
          onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">Select brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            placeholder="Sale Price"
            value={formData.sale_price}
            onChange={(e) =>
              setFormData({ ...formData, sale_price: Number(e.target.value) })
            }
            className="px-3 py-2 border rounded"
          />

          <input
            type="number"
            placeholder="MRP"
            value={formData.compare_at_price}
            onChange={(e) =>
              setFormData({ ...formData, compare_at_price: Number(e.target.value) })
            }
            className="px-3 py-2 border rounded"
          />

          <input
            type="number"
            placeholder="Stock"
            value={formData.qty_on_hand}
            onChange={(e) =>
              setFormData({ ...formData, qty_on_hand: Number(e.target.value) })
            }
            className="px-3 py-2 border rounded"
          />
        </div>

        <Select
          isMulti
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={categories
            .filter((c) => formData.categories.includes(c.id))
            .map((c) => ({ value: c.id, label: c.name }))}
          onChange={(s: any) =>
            setFormData({ ...formData, categories: s.map((x: any) => x.value) })
          }
        />

        <input type="file" multiple accept="image/*" onChange={handleImagesSelect} />

        <div className="grid grid-cols-3 gap-3">
          {formData.images.map((img, i) => (
            <img key={i} src={img} className="h-28 w-full object-cover rounded border" />
          ))}
        </div>

        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="px-3 py-2 border rounded h-32"
          placeholder="Description"
        />

        <button disabled={loading} className="bg-black text-white px-4 py-2 rounded">
          Save
        </button>
      </form>
    </div>
  );
}
