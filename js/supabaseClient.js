import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://nyjpbrtermnajfbevolc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55anBicnRlcm1uYWpmYmV2b2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNjIwMTAsImV4cCI6MjA4NDgzODAxMH0.M0nuuAHhliNEA53_252AjZVcLQMFMeOqz8tp5UOcgZ4"
);
