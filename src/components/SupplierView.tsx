import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RequestDoc } from "../types";
import PrintableRequest from "./PrintableRequest";

const SupplierView = () => {
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // debug: warn if any request is missing or malformed
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
      // filter out any rows that don't have the expected shape
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

  const formatDate = (dt: string) => {
    if (!dt) return "";
    return new Date(dt).toLocaleString();
  };

  const handleDeleteBatch = async (batchId: string | undefined) => {
    if (!batchId) return;
    if (!confirm("Are you sure you want to delete all requests in this batch?")) return;
    
    const batchRequests = requests.filter((req) => req.batchId === batchId);
    const previousRequests = requests;
    setRequests(requests.filter((req) => req.batchId !== batchId));
    
    try {
      const { error } = await supabase.from("requests").delete().eq("batchId", batchId);
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Error deleting batch:", err);
      alert("Failed to delete batch. Please check your Supabase RLS policies.");
      setRequests(previousRequests);
    }
  };

  // Group requests by batchId
  const groupedByBatch = requests.reduce<Record<string, RequestDoc[]>>((acc, req) => {
    if (!req) return acc; // skip null/undefined entries
    const batchId = req.batchId || "ungrouped";
    if (!acc[batchId]) {
      acc[batchId] = [];
    }
    acc[batchId].push(req);
    return acc;
  }, {});

  const batches = Object.entries(groupedByBatch).map(([batchId, items]) => ({
    batchId,
    requests: items,
    dateTime: items[0]?.dateTime,
    requestor: items[0]?.requestor,
    productFor: items[0]?.productFor,
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
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No requests yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {batches.map((batch) => (
                <div key={batch.batchId}>
                  {/* Batch Header */}
                  <div className="px-6 py-4 bg-muted/40 border-b border-border last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          Request Batch ({batch.requests.length} product{batch.requests.length !== 1 ? 's' : ''})
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {formatDate(batch.dateTime || '')} | Requestor: {batch.requestor || '—'} | For: {batch.productFor || '—'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <PrintableRequest requests={batch.requests} />
                        <button
                          onClick={() => handleDeleteBatch(batch.batchId)}
                          className="px-3 py-1 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
                        >
                          Delete Batch
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Batch Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm divide-y divide-border">
                      <thead>
                        <tr className="bg-muted/20">
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requestor</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">For</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batch.requests.map((req) => (
                          <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-foreground font-medium">{req?.productName || "-"}</td>
                            <td className="px-4 py-3 text-foreground">{req?.quantity ?? "-"}</td>
                            <td className="px-4 py-3 text-foreground">{req?.unit || "-"}</td>
                            <td className="px-4 py-3 text-foreground">{req?.requestor || "-"}</td>
                            <td className="px-4 py-3 text-foreground">{req?.productFor || "-"}</td>
                          </tr>
                        ))}
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
