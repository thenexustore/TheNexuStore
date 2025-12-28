"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchAdminData, postAdminData } from "@/lib/api";

const Select = dynamic(() => import("react-select"), { ssr: false });

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [newBrandName, setNewBrandName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [imageError, setImageError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    brandId: "",
    sale_price: 0,
    compare_at_price: 0,
    qty_on_hand: 0,
    status: "DRAFT",
    categories: [] as string[],
    images: [] as string[],
  });

  useEffect(() => {
    fetchAdminData("brands").then(setBrands);
    fetchAdminData("categories").then(setCategories);
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]:
        name === "sale_price" ||
        name === "compare_at_price" ||
        name === "qty_on_hand"
          ? Number(value) || 0
          : value,
    }));
  };

  const handleCategoryChange = (selected: any) => {
    setFormData((p) => ({
      ...p,
      categories: selected ? selected.map((s: any) => s.value) : [],
    }));
  };

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
        canvas
          .getContext("2d")
          ?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        const size = Math.ceil((base64.length * 3) / 4);
        size > 1024 * 1024 ? reject("Image must be < 1MB") : resolve(base64);
      };
      reader.readAsDataURL(file);
    });

  const handleImagesSelect = async (e: any) => {
    const files = Array.from(e.target.files || []);
    try {
      const imgs = await Promise.all(files.map(convertToBase64));
      setFormData((p) => ({ ...p, images: [...p.images, ...imgs] }));
    } catch (err: any) {
      setImageError(err);
    }
  };

  const removeImage = (i: number) => {
    setFormData((p) => ({
      ...p,
      images: p.images.filter((_, idx) => idx !== i),
    }));
  };

  const createBrand = async () => {
    if (!newBrandName.trim()) return;
    setLoading(true);
    const res = await postAdminData("brands", { name: newBrandName.trim() });
    if (res.success) {
      setBrands(await fetchAdminData("brands"));
      setFormData((p) => ({ ...p, brandId: res.data.id }));
      setShowNewBrand(false);
      setNewBrandName("");
    }
    setLoading(false);
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setLoading(true);
    const res = await postAdminData("categories", {
      name: newCategoryName.trim(),
    });
    if (res.success) {
      setCategories(await fetchAdminData("categories"));
      setFormData((p) => ({
        ...p,
        categories: [...p.categories, res.data.id],
      }));
      setShowNewCategory(false);
      setNewCategoryName("");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: formData.title,
      brandId: formData.brandId,
      description_html: formData.description,
      short_description: formData.description.slice(0, 200),
      status: formData.status,
      sale_price: formData.sale_price,
      compare_at_price: formData.compare_at_price,
      qty_on_hand: formData.qty_on_hand,
      categories: formData.categories,
      images_base64: formData.images,
    };

    const res = await postAdminData("products", payload);
    if (res.success) router.push("/products");
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Product</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded p-6 grid gap-5"
      >
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Product Title"
          className="px-3 py-2 border rounded"
          required
        />

        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Product Description"
          className="px-3 py-2 border rounded h-32"
        />

        {!showNewBrand ? (
          <div>
            <select
              name="brandId"
              value={formData.brandId}
              onChange={handleChange}
              className="px-3 py-2 border rounded w-full"
              required
            >
              <option value="">Select Brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewBrand(true)}
              className="text-sm text-blue-600 mt-1"
            >
              + Create new brand
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              type="button"
              onClick={createBrand}
              className="px-4 py-2 bg-black text-white rounded"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewBrand(false)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>
        )}

        {!showNewCategory ? (
          <div>
            <Select
              isMulti
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              onChange={handleCategoryChange}
              placeholder="Select Categories"
            />
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="text-sm text-blue-600 mt-1"
            >
              + Create new category
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              type="button"
              onClick={createCategory}
              className="px-4 py-2 bg-black text-white rounded"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewCategory(false)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <input
            type="number"
            name="sale_price"
            value={formData.sale_price}
            onChange={handleChange}
            placeholder="Sale Price"
            className="px-3 py-2 border rounded"
          />
          <input
            type="number"
            name="compare_at_price"
            value={formData.compare_at_price}
            onChange={handleChange}
            placeholder="MRP"
            className="px-3 py-2 border rounded"
          />
          <input
            type="number"
            name="qty_on_hand"
            value={formData.qty_on_hand}
            onChange={handleChange}
            placeholder="Stock Quantity"
            className="px-3 py-2 border rounded"
          />
        </div>

        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="px-3 py-2 border rounded"
        >
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImagesSelect}
        />
        {imageError && <p className="text-red-600 text-sm">{imageError}</p>}

        <div className="grid grid-cols-4 gap-3">
          {formData.images.map((img, i) => (
            <div key={i} className="relative">
              <img
                src={img}
                className="h-28 w-full object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-black text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
