import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iuxmmdefjqikrucsazfk.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_64xNSDqwfxrYlbQcBj78Wg_0Is1BvWS'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)