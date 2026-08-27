import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hleuarnswuooxewplaca.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZXVhcm5zd3Vvb3hld3BsYWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mjk5MjQsImV4cCI6MjEwMzQwNTkyNH0.QBpOeahfpY49abMjV_R5tEA6CZsf3Li17AKebgGEDz0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

