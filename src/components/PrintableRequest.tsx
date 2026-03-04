import { useRef } from "react";
import type { RequestDoc } from "../types";

interface Props {
  request?: RequestDoc;
  requests?: RequestDoc[];
}

const PrintableRequest = ({ request, requests }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);
  // Use requests array if provided, otherwise use single request
  const itemsToPrint = (requests ? requests : request ? [request] : []).filter(Boolean as any);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Request Form</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 2px; color: #000; }
            h1 { text-align: center; margin: 0 0 10px 0; font-size: 20px; }
            h2 { text-align: center; margin: 0 0 20px 0; font-size: 14px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 10px; text-align: center; font-size: 15px; }
            th { background: #e0e0e0; font-weight: bold; }
            @media print { body { margin: 10mm; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatDate = (dt: string) => {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleString();
  };

  if (itemsToPrint.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={handlePrint}
        className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {itemsToPrint.length > 1 ? `Print All (${itemsToPrint.length})` : "Print"}
      </button>

      <div ref={printRef} style={{ display: "none" }}>
        <h2>J1 REQUEST FORM</h2>

        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Date/Time</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Price/Item</th>
              <th>Total Price</th>
              <th>Remarks</th>
              <th>Requestor</th>
              <th>Product For</th>
            </tr>
          </thead>
          <tbody>
            {itemsToPrint.map((item, idx) => (
              <tr key={item?.id ?? idx}>
                <td>{item.productName}</td>
                <td>{formatDate(item.dateTime)}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>{item.requestor}</td>
                <td>{item.productFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PrintableRequest;
