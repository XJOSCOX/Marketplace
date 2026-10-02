-- Phase 2: tenant-safe commerce storage. No payment/order creation RPC is exposed.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.marketplaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 120),
  tagline text not null default '',
  mode text not null check (mode in ('STORE','MARKETPLACE','HYBRID')),
  owner_user_id uuid not null references public.profiles(id),
  status text not null default 'draft' check (status in ('draft','active','suspended')),
  accent text not null default '#27624c' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  commission_basis_points integer not null default 0 check (commission_basis_points between 0 and 10000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id, currency)
);
create table public.marketplace_memberships (
  id uuid primary key default gen_random_uuid(),
  marketplace_id uuid not null references public.marketplaces(id),
  user_id uuid not null references public.profiles(id),
  roles text[] not null default '{buyer}' check (cardinality(roles) > 0 and roles <@ array['buyer','seller','marketplace_owner','marketplace_staff']::text[]),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,user_id), unique(marketplace_id,id)
);
create table public.sellers (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  user_id uuid not null references public.profiles(id), name text not null,
  description text not null default '', location text not null default '',
  status text not null default 'pending' check (status in ('active','pending','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,user_id)
);
create table public.stores (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  seller_id uuid not null, slug text not null, name text not null,
  status text not null default 'active' check (status in ('active','draft')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,slug), unique(marketplace_id,seller_id),
  foreign key(marketplace_id,seller_id) references public.sellers(marketplace_id,id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  slug text not null, name text not null, icon text not null default '⌂',
  status text not null default 'active' check(status in ('active','draft')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,slug)
);
create table public.products (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  seller_id uuid not null, category_id uuid not null, name text not null check(length(name) between 1 and 120),
  description text not null default '', image_url text not null default '',
  status text not null default 'draft' check(status in ('active','draft','archived')),
  price_amount bigint not null check(price_amount between 0 and 9007199254740991),
  currency text not null default 'USD',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,id,seller_id), unique(marketplace_id,id,currency),
  foreign key(marketplace_id,currency) references public.marketplaces(id,currency),
  foreign key(marketplace_id,seller_id) references public.sellers(marketplace_id,id),
  foreign key(marketplace_id,category_id) references public.categories(marketplace_id,id)
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  product_id uuid not null, name text not null, sku text not null,
  price_amount bigint not null check(price_amount between 0 and 9007199254740991), currency text not null default 'USD',
  stock integer not null default 0 check(stock >= 0), status text not null default 'active' check(status in ('active','draft')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,product_id,id), unique(marketplace_id,sku),
  foreign key(marketplace_id,product_id,currency) references public.products(marketplace_id,id,currency)
);
create table public.carts (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  user_id uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,user_id)
);
create table public.cart_items (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  cart_id uuid not null, product_id uuid not null, variant_id uuid not null,
  quantity integer not null check(quantity between 1 and 999),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(cart_id,variant_id),
  foreign key(marketplace_id,cart_id) references public.carts(marketplace_id,id) on delete cascade,
  foreign key(marketplace_id,product_id,variant_id) references public.product_variants(marketplace_id,product_id,id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  user_id uuid not null references public.profiles(id), status text not null default 'processing' check(status in ('processing','shipped','delivered','cancelled')),
  subtotal_amount bigint not null check(subtotal_amount between 0 and 9007199254740991),
  total_amount bigint not null check(total_amount between 0 and 9007199254740991),
  commission_amount bigint not null default 0 check(commission_amount between 0 and total_amount),
  currency text not null default 'USD', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,id,currency),
  foreign key(marketplace_id,currency) references public.marketplaces(id,currency)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  order_id uuid not null, product_id uuid not null, variant_id uuid not null, seller_id uuid not null,
  name text not null, quantity integer not null check(quantity between 1 and 999),
  price_amount bigint not null check(price_amount between 0 and 9007199254740991),
  subtotal_amount bigint not null check(subtotal_amount between 0 and 9007199254740991),
  commission_amount bigint not null default 0 check(commission_amount between 0 and subtotal_amount),
  currency text not null default 'USD', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(subtotal_amount = price_amount * quantity), unique(marketplace_id,id),
  foreign key(marketplace_id,order_id,currency) references public.orders(marketplace_id,id,currency),
  foreign key(marketplace_id,product_id,seller_id) references public.products(marketplace_id,id,seller_id),
  foreign key(marketplace_id,product_id,variant_id) references public.product_variants(marketplace_id,product_id,id)
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  product_id uuid not null, user_id uuid not null references public.profiles(id) default auth.uid(),
  rating integer not null check(rating between 1 and 5), body text not null check(length(body) between 1 and 5000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,product_id,user_id),
  foreign key(marketplace_id,product_id) references public.products(marketplace_id,id)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  seller_id uuid not null, subject text not null check(length(subject) between 1 and 200),
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(marketplace_id,id), foreign key(marketplace_id,seller_id) references public.sellers(marketplace_id,id)
);
create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  conversation_id uuid not null, user_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  unique(marketplace_id,id), unique(marketplace_id,conversation_id,user_id),
  foreign key(marketplace_id,conversation_id) references public.conversations(marketplace_id,id) on delete cascade
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), marketplace_id uuid not null references public.marketplaces(id),
  conversation_id uuid not null, sender_id uuid not null default auth.uid(), body text not null check(length(body) between 1 and 10000),
  created_at timestamptz not null default now(), unique(marketplace_id,id),
  foreign key(marketplace_id,conversation_id,sender_id) references public.conversation_participants(marketplace_id,conversation_id,user_id)
);

-- Helpers never trust a claimed user/role argument. Definer access avoids recursive RLS.
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.platform_admins where user_id = (select auth.uid()))
$$;
create function private.has_role(tenant uuid, allowed text[]) returns boolean language sql stable security definer set search_path = '' as $$
 select private.is_admin() or exists(select 1 from public.marketplace_memberships mm join public.marketplaces m on m.id=mm.marketplace_id
 where mm.marketplace_id=tenant and mm.user_id=(select auth.uid()) and mm.status='active' and m.status='active'
 and exists(select 1 from unnest(mm.roles) r where r=any(allowed) and (r<>'marketplace_owner' or m.owner_user_id=mm.user_id)))
$$;
create function private.is_owner(tenant uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.is_admin() or (exists(select 1 from public.marketplaces where id=tenant and owner_user_id=(select auth.uid()) and status='active')
 and private.has_role(tenant,array['marketplace_owner']))
$$;
create function private.manages(tenant uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.has_role(tenant,array['marketplace_owner','marketplace_staff'])
$$;
create function private.seller_access(tenant uuid, seller uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.manages(tenant) or (private.has_role(tenant,array['seller']) and exists(select 1 from public.sellers where marketplace_id=tenant and id=seller and user_id=(select auth.uid()) and status='active'))
$$;
create function private.public_marketplace(tenant uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.marketplaces where id=tenant and status='active')
$$;
create function private.public_seller(tenant uuid, seller uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.sellers s join public.marketplaces m on m.id=s.marketplace_id where m.id=tenant and s.id=seller and m.status='active' and s.status='active'
 and (m.mode='HYBRID' or (m.mode='STORE' and s.user_id=m.owner_user_id) or (m.mode='MARKETPLACE' and s.user_id<>m.owner_user_id)))
$$;
create function private.public_product(tenant uuid, product uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.products p join public.categories c on c.marketplace_id=p.marketplace_id and c.id=p.category_id where p.marketplace_id=tenant and p.id=product and p.status='active' and c.status='active' and private.public_seller(tenant,p.seller_id))
$$;
create function private.product_access(tenant uuid, product uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.products where marketplace_id=tenant and id=product and private.seller_access(tenant,seller_id))
$$;
create function private.owns_cart(tenant uuid, cart uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.carts where marketplace_id=tenant and id=cart and user_id=(select auth.uid()))
$$;
create function private.owns_order(tenant uuid, ord uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.orders where marketplace_id=tenant and id=ord and user_id=(select auth.uid()))
$$;
create function private.purchased(tenant uuid, product uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.order_items i join public.orders o on o.marketplace_id=i.marketplace_id and o.id=i.order_id where i.marketplace_id=tenant and i.product_id=product and o.user_id=(select auth.uid()) and o.status='delivered')
$$;
create function private.participates(tenant uuid, conversation uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.conversation_participants where marketplace_id=tenant and conversation_id=conversation and user_id=(select auth.uid()))
$$;

-- New auth identities get only a profile, never a privileged role from metadata.
create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),120));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();
insert into public.profiles(id,display_name) select id,left(coalesce(raw_user_meta_data->>'display_name',''),120) from auth.users on conflict do nothing;

-- Ownership/relationship IDs are immutable, even when both rows are visible to a user.
create function private.guard_update() returns trigger language plpgsql set search_path = '' as $$
declare k text;
begin
 foreach k in array array['id','marketplace_id','user_id','owner_user_id','seller_id','product_id','variant_id','cart_id','order_id','conversation_id','created_by','sender_id','currency','created_at'] loop
  if to_jsonb(new)->k is distinct from to_jsonb(old)->k then raise exception 'Immutable resource identity' using errcode='23514'; end if;
 end loop;
 if to_jsonb(new) ? 'updated_at' then new := jsonb_populate_record(new,jsonb_build_object('updated_at',now())); end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['profiles','marketplaces','marketplace_memberships','sellers','stores','categories','products','product_variants','carts','cart_items','orders','order_items','reviews','conversations','conversation_participants','messages'] loop
  execute format('create trigger guard_update before update on public.%I for each row execute function private.guard_update()',t);
 end loop;
 foreach t in array array['profiles','platform_admins','marketplaces','marketplace_memberships','sellers','stores','categories','products','product_variants','carts','cart_items','orders','order_items','reviews','conversations','conversation_participants','messages'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;

grant select on public.marketplaces, public.sellers, public.stores, public.categories, public.products, public.product_variants, public.reviews to anon;
grant update(display_name,avatar_url) on public.profiles to authenticated;
grant update(name,tagline,mode,accent,commission_basis_points) on public.marketplaces to authenticated;
grant insert,update,delete on public.marketplace_memberships,public.sellers,public.stores,public.categories,public.products,public.product_variants,public.carts,public.cart_items,public.reviews to authenticated;
grant insert on public.messages to authenticated;

create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or private.is_admin());
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy admins_read on public.platform_admins for select to authenticated using(user_id=(select auth.uid()) or private.is_admin());
create policy marketplaces_read on public.marketplaces for select using(status='active' or private.is_admin());
create policy marketplaces_update on public.marketplaces for update to authenticated using(private.is_owner(id)) with check(private.is_owner(id));
create policy memberships_read on public.marketplace_memberships for select to authenticated using(user_id=(select auth.uid()) or private.manages(marketplace_id));
create policy memberships_insert on public.marketplace_memberships for insert to authenticated with check(private.is_owner(marketplace_id) and not ('marketplace_owner'=any(roles)));
create policy memberships_update on public.marketplace_memberships for update to authenticated using(private.is_owner(marketplace_id) and not ('marketplace_owner'=any(roles))) with check(private.is_owner(marketplace_id) and not ('marketplace_owner'=any(roles)));
create policy memberships_delete on public.marketplace_memberships for delete to authenticated using(private.is_owner(marketplace_id) and not ('marketplace_owner'=any(roles)));
create policy sellers_read on public.sellers for select using(private.public_seller(marketplace_id,id) or private.seller_access(marketplace_id,id));
-- Seller approval and identity provisioning are marketplace-management operations.
create policy sellers_write on public.sellers for all to authenticated using(private.manages(marketplace_id)) with check(private.manages(marketplace_id));
create policy stores_read on public.stores for select using((status='active' and private.public_seller(marketplace_id,seller_id)) or private.seller_access(marketplace_id,seller_id));
create policy stores_write on public.stores for all to authenticated using(private.seller_access(marketplace_id,seller_id)) with check(private.seller_access(marketplace_id,seller_id));
create policy categories_read on public.categories for select using((status='active' and private.public_marketplace(marketplace_id)) or private.manages(marketplace_id));
create policy categories_write on public.categories for all to authenticated using(private.manages(marketplace_id)) with check(private.manages(marketplace_id));
create policy products_read on public.products for select using(private.public_product(marketplace_id,id) or private.seller_access(marketplace_id,seller_id));
create policy products_write on public.products for all to authenticated using(private.seller_access(marketplace_id,seller_id)) with check(private.seller_access(marketplace_id,seller_id));
create policy variants_read on public.product_variants for select using((status='active' and private.public_product(marketplace_id,product_id)) or private.product_access(marketplace_id,product_id));
create policy variants_write on public.product_variants for all to authenticated using(private.product_access(marketplace_id,product_id)) with check(private.product_access(marketplace_id,product_id));
create policy carts_read on public.carts for select to authenticated using(user_id=(select auth.uid()) or private.is_admin());
create policy carts_insert on public.carts for insert to authenticated with check(user_id=(select auth.uid()) and private.public_marketplace(marketplace_id));
create policy carts_update on public.carts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy carts_delete on public.carts for delete to authenticated using(user_id=(select auth.uid()));
create policy cart_items_read on public.cart_items for select to authenticated using(private.owns_cart(marketplace_id,cart_id) or private.is_admin());
create policy cart_items_insert on public.cart_items for insert to authenticated with check(private.owns_cart(marketplace_id,cart_id) and private.public_product(marketplace_id,product_id) and exists(select 1 from public.product_variants v where v.marketplace_id=cart_items.marketplace_id and v.id=variant_id and v.status='active' and v.stock>=quantity));
create policy cart_items_update on public.cart_items for update to authenticated using(private.owns_cart(marketplace_id,cart_id)) with check(private.owns_cart(marketplace_id,cart_id) and private.public_product(marketplace_id,product_id) and exists(select 1 from public.product_variants v where v.marketplace_id=cart_items.marketplace_id and v.id=variant_id and v.status='active' and v.stock>=quantity));
create policy cart_items_delete on public.cart_items for delete to authenticated using(private.owns_cart(marketplace_id,cart_id));
create policy orders_read on public.orders for select to authenticated using(user_id=(select auth.uid()) or private.manages(marketplace_id));
create policy order_items_read on public.order_items for select to authenticated using(private.owns_order(marketplace_id,order_id) or private.seller_access(marketplace_id,seller_id));
create policy reviews_read on public.reviews for select using(private.public_product(marketplace_id,product_id) or user_id=(select auth.uid()) or private.manages(marketplace_id));
create policy reviews_insert on public.reviews for insert to authenticated with check(user_id=(select auth.uid()) and private.purchased(marketplace_id,product_id));
create policy reviews_update on public.reviews for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and private.purchased(marketplace_id,product_id));
create policy reviews_delete on public.reviews for delete to authenticated using(user_id=(select auth.uid()) or private.manages(marketplace_id));
create policy conversations_read on public.conversations for select to authenticated using(private.participates(marketplace_id,id) or private.is_admin());
create policy participants_read on public.conversation_participants for select to authenticated using(private.participates(marketplace_id,conversation_id) or private.is_admin());
create policy messages_read on public.messages for select to authenticated using(private.participates(marketplace_id,conversation_id) or private.is_admin());
create policy messages_insert on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and private.participates(marketplace_id,conversation_id) and private.public_marketplace(marketplace_id));

create function public.start_conversation(tenant uuid, seller uuid, subject text) returns uuid language plpgsql security definer set search_path = '' as $$
declare conversation uuid; seller_user uuid;
begin
 if auth.uid() is null or not private.public_seller(tenant,seller) then raise exception 'Not permitted' using errcode='42501'; end if;
 select user_id into seller_user from public.sellers where marketplace_id=tenant and id=seller;
 insert into public.conversations(marketplace_id,seller_id,subject,created_by) values(tenant,seller,subject,auth.uid()) returning id into conversation;
 insert into public.conversation_participants(marketplace_id,conversation_id,user_id) values(tenant,conversation,auth.uid()),(tenant,conversation,seller_user) on conflict do nothing;
 return conversation;
end $$;
revoke all on function public.start_conversation(uuid,uuid,text) from public,anon;
grant execute on function public.start_conversation(uuid,uuid,text) to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.is_admin(),private.has_role(uuid,text[]),private.is_owner(uuid),private.manages(uuid),private.seller_access(uuid,uuid),private.public_marketplace(uuid),private.public_seller(uuid,uuid),private.public_product(uuid,uuid),private.product_access(uuid,uuid),private.owns_cart(uuid,uuid),private.owns_order(uuid,uuid),private.purchased(uuid,uuid),private.participates(uuid,uuid) to anon,authenticated;

-- Public DTO views expose only public fields and cast BIGINT to decimal strings.
-- security_invoker retains the caller's RLS; explicit public predicates also hide drafts from privileged catalog callers.
create view public.catalog_products with (security_invoker=true) as
 select p.id,p.marketplace_id,p.seller_id,p.category_id,p.name,p.description,p.image_url,p.price_amount::text as price_amount,p.currency,p.created_at
 from public.products p where private.public_product(p.marketplace_id,p.id);
create view public.catalog_variants with (security_invoker=true) as
 select v.id,v.marketplace_id,v.product_id,v.name,v.sku,v.stock,v.price_amount::text as price_amount,v.currency
 from public.product_variants v where v.status='active' and private.public_product(v.marketplace_id,v.product_id);
grant select on public.catalog_products, public.catalog_variants to anon,authenticated;

create index memberships_user on public.marketplace_memberships(user_id,marketplace_id);
create index sellers_user on public.sellers(user_id,marketplace_id);
create index products_catalog on public.products(marketplace_id,status,created_at,id);
create index products_seller on public.products(marketplace_id,seller_id);
create index variants_product on public.product_variants(marketplace_id,product_id);
create index orders_buyer on public.orders(user_id,marketplace_id,created_at);
create index order_items_seller on public.order_items(marketplace_id,seller_id,order_id);
create index participants_user on public.conversation_participants(user_id,marketplace_id,conversation_id);
create index messages_conversation on public.messages(marketplace_id,conversation_id,created_at);
