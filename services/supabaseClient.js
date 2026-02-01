import { createClient } from "@supabase/supabase-js";

// const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_URL ="https://vxpjkzpkcjbtvtxzdbeb.supabase.co";
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cGprenBrY2pidHZ0eHpkYmViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTc1OTM2MywiZXhwIjoyMDU3MzM1MzYzfQ.lKCwdyGzE5IkxF-bNCtV9ruM9PCyzIFzi8UWX-IZr7Y";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);