-- Feature set: zones & seats, in-club shop with orders, player ↔ club chat.


-- ---------------------------------------------------------------- zones / seats
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS vip_seats integer NOT NULL DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS vip_price_per_hour integer NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS zone text NOT NULL DEFAULT 'standard';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS seat integer;

-- Seats already taken for a slot. SECURITY DEFINER so players can plan a booking
-- without reading other players' rows.
CREATE OR REPLACE FUNCTION public.occupied_seats(_club_id text, _date date, _start text, _hours integer)
RETURNS integer[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT b.seat), '{}'::integer[])
  FROM public.bookings b
  WHERE b.club_id = _club_id
    AND b.booking_date = _date
    AND b.seat IS NOT NULL
    AND b.status IN ('upcoming', 'active')
    AND split_part(b.start_time, ':', 1)::int < split_part(_start, ':', 1)::int + _hours
    AND split_part(b.start_time, ':', 1)::int + b.hours > split_part(_start, ':', 1)::int
$$;
REVOKE ALL ON FUNCTION public.occupied_seats(text, date, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.occupied_seats(text, date, text, integer) TO anon, authenticated;

-- ---------------------------------------------------------------- shop
CREATE TABLE public.club_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'drinks',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  size_label text NOT NULL DEFAULT '',
  price_kzt integer NOT NULL DEFAULT 0,
  old_price_kzt integer,
  image_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX club_products_club_idx ON public.club_products (club_id, is_active);
GRANT SELECT ON public.club_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_products TO authenticated;
GRANT ALL ON public.club_products TO service_role;
ALTER TABLE public.club_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.club_products FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products club insert" ON public.club_products FOR INSERT TO authenticated
  WITH CHECK (public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products club update" ON public.club_products FOR UPDATE TO authenticated
  USING (public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products club delete" ON public.club_products FOR DELETE TO authenticated
  USING (public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  club_id text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  seat integer,
  player_name text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_kzt integer NOT NULL DEFAULT 0,
  comment text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'delivered', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_club_idx ON public.orders (club_id, status, created_at DESC);
CREATE INDEX orders_user_idx ON public.orders (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders read own or club" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders insert own" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders update own or club" ON public.orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------- chat
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  -- the player whose thread this message belongs to
  user_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('player', 'club')),
  author_name text NOT NULL DEFAULT '',
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX chat_thread_idx ON public.chat_messages (club_id, user_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat read own or club" ON public.chat_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "chat insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    (sender = 'player' AND user_id = auth.uid())
    OR (sender = 'club' AND (public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin')))
  );
CREATE POLICY "chat mark read" ON public.chat_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.is_club_member(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
