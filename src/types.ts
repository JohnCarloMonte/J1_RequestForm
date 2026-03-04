export type Role = "requestor" | "supplier" | null;

export interface RequestDoc {
  id?: string;
  batchId?: string;
  dateTime: string;
  quantity: number;
  unit: string;
  productName: string;
  requestor: string;
  productFor: string;
  status: string;
}
