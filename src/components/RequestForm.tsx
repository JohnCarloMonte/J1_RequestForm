import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMenuSettings } from "../hooks/useMenuSettings";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RequestRow {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  customUnit: string;
  requestor: string;
  productFor: string;
}

const RequestForm = () => {
  const navigate = useNavigate();
  const { settings, loading } = useMenuSettings();
  const [requests, setRequests] = useState<RequestRow[]>([
    {
      id: "1",
      productName: "",
      quantity: "",
      unit: "",
      customUnit: "",
      requestor: "",
      productFor: "",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => {
    const newId = String(Math.max(...requests.map((r) => Number(r.id)), 0) + 1);
    setRequests([
      ...requests,
      {
        id: newId,
        productName: "",
        quantity: "",
        unit: "",
        customUnit: "",
        requestor: "",
        productFor: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (requests.length > 1) {
      setRequests(requests.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof RequestRow, value: string) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const parseQuantity = (quantityStr: string): number => {
    quantityStr = quantityStr.trim();
    if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/');
      const num = parseFloat(numerator);
      const denom = parseFloat(denominator);
      if (isNaN(num) || isNaN(denom) || denom === 0) {
        throw new Error("Invalid fraction format. Use format like '1/2'.");
      }
      return num / denom;
    }
    const num = parseFloat(quantityStr);
    if (isNaN(num)) {
      throw new Error("Invalid quantity. Use a number or fraction like '1/2'.");
    }
    return num;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      
      const batchId = crypto.randomUUID();
      
      const payload = requests.map((row) => {
        if (!row.productName) {
          throw new Error("Product name is required for every row.");
        }
        const finalUnit = row.unit === "add-custom" ? row.customUnit : row.unit;
        if (!finalUnit) {
          throw new Error("Please select or enter a unit for all requests.");
        }
        return {
          batchId,
          quantity: parseQuantity(row.quantity),
          unit: finalUnit,
          productName: row.productName,
          requestor: row.requestor,
          productFor: row.productFor,
          status: "Pending",
        };
      });

      const { error } = await supabase.from("requests").insert(payload);
      if (error) throw error;

  
      setRequests([
        {
          id: "1",
          productName: "",
          quantity: "",
          unit: "",
          customUnit: "",
          requestor: "",
          productFor: "",
        },
      ]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error submitting requests:", err);
      alert("Failed to submit requests. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-1">New Requests</h2>
          <p className="text-sm text-muted-foreground mb-6">Add multiple products and submit all at once.</p>

          {success && (
            <div className="mb-4 px-4 py-3 rounded-md bg-success/10 border border-success/30 text-success text-sm font-medium">
              ✓ All requests submitted successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {requests.filter(Boolean).map((row, index) => (
              <div key={row?.id ?? index} className="border border-border rounded-lg p-4 space-y-4 relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Request #{index + 1}</h3>
                  {requests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-2">Product Name</label>
                    <input
                      type="text"
                      value={row?.productName || ""}
                      onChange={(e) => row && updateRow(row.id, "productName", e.target.value)}
                      required
                      placeholder="Product Name"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Quantity</label>
                    <input
                      type="text"
                      value={row?.quantity || ""}
                      onChange={(e) => row && updateRow(row.id, "quantity", e.target.value)}
                      required
                      placeholder="Amount (e.g., 5 or 1/2)"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Unit</label>
                    <select
                      value={row?.unit || ""}
                      onChange={(e) => row && updateRow(row.id, "unit", e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    >
                      <option value="">Select unit</option>
                      {settings.units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="add-custom">+ Add Unit</option>
                    </select>
                    {row.unit === "add-custom" && (
                      <input
                        type="text"
                        value={row?.customUnit || ""}
                        onChange={(e) => row && updateRow(row.id, "customUnit", e.target.value)}
                        placeholder="Enter custom unit"
                        className="w-full px-4 py-3 mt-2 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Requestor</label>
                    <select
                      value={row?.requestor || ""}
                      onChange={(e) => row && updateRow(row.id, "requestor", e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    >
                      <option value="">Select requestor</option>
                      {settings.requestors.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-2">Product For</label>
                    <select
                      value={row?.productFor || ""}
                      onChange={(e) => row && updateRow(row.id, "productFor", e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    >
                      <option value="">Select product for</option>
                      {settings.productsFor.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-input text-foreground font-semibold text-sm hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-50 shadow-md"
            >
              {submitting ? "Submitting..." : `Submit All (${requests.length})`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
