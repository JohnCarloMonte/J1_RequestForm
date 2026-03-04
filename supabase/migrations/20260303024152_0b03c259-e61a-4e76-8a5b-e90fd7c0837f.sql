
-- Create requests table
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "batchId" UUID NOT NULL,
  "dateTime" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  requestor TEXT NOT NULL,
  "productFor" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
);

-- Create settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  units TEXT[] NOT NULL,
  requestors TEXT[] NOT NULL,
  "productsFor" TEXT[] NOT NULL
);

-- Disable RLS since no authentication is used
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public access (no auth)
CREATE POLICY "Allow public read requests" ON public.requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert requests" ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete requests" ON public.requests FOR DELETE USING (true);
CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);

-- Insert default settings
INSERT INTO public.settings (units, requestors, "productsFor")
VALUES (
  ARRAY['pc', 'sack', 'pack', 'kilo', 'case'],
  ARRAY['Aira', 'Francia', 'Airene', 'Dianne'],
  ARRAY['J1']
);
