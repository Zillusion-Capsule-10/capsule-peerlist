import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://lxetfnixsdufsfnfukyu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZXRmbml4c2R1ZnNmbmZ1a3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MTQ2NjAsImV4cCI6MjA1MDE5MDY2MH0.iQHAHRSSLG7i2BGrkViA_1LMbptLFRVvIoZb9hGFzVY'
);
