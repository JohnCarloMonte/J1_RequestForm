import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RequestDoc } from "../types";
import PrintableRequest from "./PrintableRequest";
import { Pencil, Trash2, X, Check } from "lucide-react";

interface EditingRow {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  requestor: string;
  productFor: string;
}

const SupplierView = () => {
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    requests.forEach((r, i) => {
      if (!r || typeof r.productName !== "string") {
        console.warn("SupplierView requests[", i, "] malformed:", r);
      }
    });
  }, [requests]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("dateTime", { ascending: false });

    if (!error && data) {
      const clean = (data as any[]).filter((r) => {
        if (!r || typeof r.productName !== "string") {
          console.warn("Ignoring malformed row:", r);
          return false;
        }
        return true;
      }) as RequestDoc[];
      setRequests(clean);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteRow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;

    const previous = requests;
    setRequests(requests.filter((r) => r.id !== id));

    try {
      const { error } = await supabase.from("requests").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting request:", err);
      alert("Failed to delete request. Please check your Supabase RLS policies.");
      setRequests(previous);
    }
  };

  const handleDeleteBatch = async (batchId: string | undefined) => {
    if (!batchId) return;
    if (!confirm("Are you sure you want to delete all requests in this batch?")) return;

    const previous = requests;
    setRequests(requests.filter((req) => req.batchId !== batchId));

    try {
      const { error } = await supabase.from("requests").delete().eq("batchId", batchId);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting batch:", err);
      alert("Failed to delete batch. Please check your Supabase RLS policies.");
      setRequests(previous);
    }
  };

  const startEditing = (req: RequestDoc) => {
    setEditingRow({
      id: req.id,
      productName: req.productName,
      quantity: String(req.quantity),
      unit: req.unit,
      requestor: req.requestor,
      productFor: req.productFor,
    });
  };

  const cancelEditing = () => setEditingRow(null);

  const saveEdit = async () => {
    if (!editingRow) return;
    setSaving(true);

    const quantityNum = parseFloat(editingRow.quantity);
    if (isNaN(quantityNum)) {
      alert("Invalid quantity.");
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("requests")
        .update({
          productName: editingRow.productName,
          quantity: quantityNum,
          unit: editingRow.unit,
          requestor: editingRow.requestor,
          productFor: editingRow.productFor,
        })
        .eq("id", editingRow.id);

      if (error) throw error;

      setRequests(
        requests.map((r) =>
          r.id === editingRow.id
            ? { ...r, ...editingRow, quantity: quantityNum }
            : r
        )
      );
      setEditingRow(null);
    } catch (err: any) {
      console.error("Error saving edit:", err);
      alert(err?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const groupedByDate = requests.reduce<Record<string, RequestDoc[]>>((acc, req) => {
    if (!req) return acc;
    const date = req.dateTime ? new Date(req.dateTime).toISOString().split("T")[0] : "unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(req);
    return acc;
  }, {});

  const dailyGroups = Object.entries(groupedByDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      requests: items,
      totalRequests: items.length,
      uniqueRequestors: [...new Set(items.map((r) => r.requestor))],
    }));

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">All Requests</h2>
            <p className="text-sm text-muted-foreground">Real-time view of all submitted request batches</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading requests...</div>
          ) : dailyGroups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No requests yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {dailyGroups.map((day) => (
                <div key={day.date}>
                  {/* Day Header */}
                  <div className="px-6 py-4 bg-muted/40 border-b border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {day.date === "unknown"
                            ? "Unknown Date"
                            : new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {day.totalRequests} request{day.totalRequests !== 1 ? "s" : ""} | Requestors:{" "}
                          {day.uniqueRequestors.join(", ")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <PrintableRequest requests={day.requests} />
                      </div>
                    </div>
                  </div>

                  {/* Daily Requests Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm divide-y divide-border">
                      <thead>
                        <tr className="bg-muted/20">
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requestor</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">For</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.requests
                          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                          .map((req) => {
                            const isEditing = editingRow?.id === req.id;
                            return (
                              <tr key={req.id} className={`transition-colors ${isEditing ? "bg-muted/50" : "hover:bg-muted/30"}`}>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      className="w-full px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                      value={editingRow.productName}
                                      onChange={(e) => setEditingRow({ ...editingRow, productName: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-foreground font-medium">{req?.productName || "-"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      className="w-20 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                      value={editingRow.quantity}
                                      onChange={(e) => setEditingRow({ ...editingRow, quantity: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-foreground">{req?.quantity ?? "-"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      className="w-24 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                      value={editingRow.unit}
                                      onChange={(e) => setEditingRow({ ...editingRow, unit: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-foreground">{req?.unit || "-"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-foreground text-xs">
                                  {req?.dateTime ? new Date(req.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      className="w-28 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                      value={editingRow.requestor}
                                      onChange={(e) => setEditingRow({ ...editingRow, requestor: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-foreground">{req?.requestor || "-"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isEditing ? (
                                    <input
                                      className="w-28 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                      value={editingRow.productFor}
                                      onChange={(e) => setEditingRow({ ...editingRow, productFor: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-foreground">{req?.productFor || "-"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={saveEdit}
                                          disabled={saving}
                                          title="Save"
                                          className="p-1.5 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          title="Cancel"
                                          className="p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startEditing(req)}
                                          title="Edit"
                                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRow(req.id)}
                                          title="Delete"
                                          className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierView;
