-- Additive hardening; existing invalid data causes migration failure, never silent truncation.
-- No order write privileges, even for application platform admins.
revoke insert, update, delete on public.orders, public.order_items from public, anon, authenticated;
revoke all on all tables in schema public from public;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

-- Private correspondence has no implicit administrator/moderator backdoor.
alter policy conversations_read on public.conversations using(private.participates(marketplace_id,id));
alter policy participants_read on public.conversation_participants using(private.participates(marketplace_id,conversation_id));
alter policy messages_read on public.messages using(private.participates(marketplace_id,conversation_id));
alter policy carts_read on public.carts using(user_id=(select auth.uid()));
alter policy cart_items_read on public.cart_items using(private.owns_cart(marketplace_id,cart_id));

alter table public.marketplaces add constraint marketplace_limits check(length(slug) between 1 and 80 and length(btrim(name))>0 and length(tagline)<=300);
alter table public.marketplace_memberships add constraint roles_no_null check(array_position(roles,null) is null and cardinality(roles)<=4);
alter table public.sellers drop constraint sellers_status_check;
alter table public.sellers add constraint sellers_status_check check(status in ('pending','active','suspended','rejected'));
alter table public.sellers add constraint seller_limits check(length(btrim(name)) between 1 and 120 and length(description)<=10000 and length(location)<=200);
alter table public.stores add constraint store_limits check(length(btrim(name)) between 1 and 120 and length(slug) between 1 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
alter table public.categories add constraint category_limits check(length(btrim(name)) between 1 and 120 and length(slug) between 1 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(icon)<=32);
alter table public.products add constraint product_limits check(length(btrim(name))>0 and length(description)<=10000 and (image_url='' or (length(image_url)<=2048 and image_url ~ '^https://[^[:space:]@]+$')));
alter table public.profiles add constraint avatar_limits check(avatar_url is null or (length(avatar_url)<=2048 and avatar_url ~ '^https://[^[:space:]@]+$'));
alter table public.product_variants add constraint variant_limits check(length(btrim(name)) between 1 and 120 and length(sku) between 1 and 80 and sku ~ '^[A-Za-z0-9._-]+$' and stock<=1000000);
alter table public.conversations add constraint subject_nonblank check(length(btrim(subject))>0);
alter table public.messages add constraint message_nonblank check(length(btrim(body))>0);
alter table public.reviews add constraint review_nonblank check(length(btrim(body))>0);

-- Only lifecycle RPCs may create/approve seller identities. Owners retain ordinary
-- non-owner membership administration; membership alone never activates a seller.
drop policy sellers_write on public.sellers;
revoke insert,update,delete on public.sellers from authenticated;
alter policy sellers_read on public.sellers using(private.public_seller(marketplace_id,id) or private.manages(marketplace_id) or user_id=(select auth.uid()));

create function public.create_marketplace(requested_slug text, title text, marketplace_mode text, currency_code text default 'USD') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); tenant uuid; seller uuid; normalized text;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 normalized:=lower(btrim(requested_slug));
 if normalized is null or length(normalized) not between 1 and 80 or normalized !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
 or title is null or length(btrim(title)) not between 1 and 120 or marketplace_mode is null or marketplace_mode not in ('STORE','MARKETPLACE','HYBRID')
 or currency_code is null or currency_code !~ '^[A-Z]{3}$' then raise exception 'Invalid marketplace' using errcode='23514'; end if;
 insert into public.marketplaces(slug,name,mode,owner_user_id,status,currency) values(normalized,btrim(title),marketplace_mode,actor,'active',currency_code) returning id into tenant;
 insert into public.marketplace_memberships(marketplace_id,user_id,roles) values(tenant,actor,array['buyer','marketplace_owner']);
 if marketplace_mode in ('STORE','HYBRID') then
  insert into public.sellers(marketplace_id,user_id,name,status) values(tenant,actor,btrim(title),'active') returning id into seller;
  insert into public.stores(marketplace_id,seller_id,slug,name) values(tenant,seller,normalized,btrim(title));
  update public.marketplace_memberships set roles=array['buyer','seller','marketplace_owner'] where marketplace_id=tenant and user_id=actor;
 end if;
 return tenant;
end $$;

create function public.apply_seller(tenant uuid, title text, description text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid; m public.marketplaces;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into m from public.marketplaces where id=tenant for share;
 if not found or m.status<>'active' or m.mode='STORE' or m.owner_user_id=actor then raise exception 'Applications unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.marketplace_memberships where marketplace_id=tenant and user_id=actor and status='suspended') then raise exception 'Membership suspended' using errcode='42501'; end if;
 insert into public.sellers(marketplace_id,user_id,name,description,status) values(tenant,actor,btrim(title),description,'pending') returning id into result;
 insert into public.marketplace_memberships(marketplace_id,user_id,roles) values(tenant,actor,array['buyer']) on conflict(marketplace_id,user_id) do nothing;
 return result;
end $$;

create function public.review_seller(tenant uuid, seller uuid, decision text) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.sellers; m public.marketplaces;
begin
 if auth.uid() is null or not private.manages(tenant) then raise exception 'Not permitted' using errcode='42501'; end if;
 select * into m from public.marketplaces where id=tenant for share;
 select * into s from public.sellers where marketplace_id=tenant and id=seller for update;
 if not found or s.user_id=auth.uid() or s.user_id=m.owner_user_id then raise exception 'Not permitted' using errcode='42501'; end if;
 if decision is null or decision not in ('active','suspended','rejected') or (decision='active' and m.mode='STORE') then raise exception 'Invalid decision' using errcode='23514'; end if;
 if decision='active' and exists(select 1 from public.marketplace_memberships where marketplace_id=tenant and user_id=s.user_id and status='suspended') then raise exception 'Membership suspended' using errcode='42501'; end if;
 update public.sellers set status=decision where marketplace_id=tenant and id=seller;
 if decision='active' then
  insert into public.marketplace_memberships(marketplace_id,user_id,roles) values(tenant,s.user_id,array['buyer','seller'])
  on conflict(marketplace_id,user_id) do update set roles=case when 'seller'=any(public.marketplace_memberships.roles) then public.marketplace_memberships.roles else array_append(public.marketplace_memberships.roles,'seller') end;
  insert into public.stores(marketplace_id,seller_id,slug,name) values(tenant,seller,'seller-'||seller::text,s.name) on conflict(marketplace_id,seller_id) do nothing;
 end if;
 return seller;
end $$;

revoke all on function public.create_marketplace(text,text,text,text),public.apply_seller(uuid,text,text),public.review_seller(uuid,uuid,text) from public,anon;
grant execute on function public.create_marketplace(text,text,text,text),public.apply_seller(uuid,text,text),public.review_seller(uuid,uuid,text) to authenticated;

-- No unlocked direct quantity mutations. Removal remains allowed for stale items.
revoke insert,update on public.cart_items from authenticated;
drop policy cart_items_insert on public.cart_items;
drop policy cart_items_update on public.cart_items;
create function private.change_cart(tenant uuid, variant uuid, quantity_value integer, additive boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.product_variants; cart uuid; item uuid; existing integer; desired integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if quantity_value is null or quantity_value not between 1 and 999 then raise exception 'Invalid quantity' using errcode='23514'; end if;
 -- Lock eligibility rows before inventory and cart, preventing concurrent unpublishing
 -- or mode/seller changes from slipping between validation and mutation.
 perform 1 from public.marketplaces where id=tenant for share;
 perform 1 from public.sellers s join public.products p on p.marketplace_id=s.marketplace_id and p.seller_id=s.id join public.product_variants pv on pv.marketplace_id=p.marketplace_id and pv.product_id=p.id where pv.marketplace_id=tenant and pv.id=variant for share of s;
 perform 1 from public.categories c join public.products p on p.marketplace_id=c.marketplace_id and p.category_id=c.id join public.product_variants pv on pv.marketplace_id=p.marketplace_id and pv.product_id=p.id where pv.marketplace_id=tenant and pv.id=variant for share of c,p;
 select * into v from public.product_variants where marketplace_id=tenant and id=variant and status='active' for update;
 if not found or not private.public_product(tenant,v.product_id) then raise exception 'Variant unavailable' using errcode='42501'; end if;
 insert into public.carts(marketplace_id,user_id) values(tenant,auth.uid()) on conflict(marketplace_id,user_id) do update set updated_at=now() returning id into cart;
 select quantity into existing from public.cart_items where marketplace_id=tenant and cart_id=cart and variant_id=variant for update;
 desired:=case when additive then coalesce(existing,0)+quantity_value else quantity_value end;
 if desired>least(v.stock,999) then raise exception 'Quantity unavailable' using errcode='23514'; end if;
 insert into public.cart_items(marketplace_id,cart_id,product_id,variant_id,quantity) values(tenant,cart,v.product_id,variant,desired)
 on conflict(cart_id,variant_id) do update set quantity=excluded.quantity returning id into item;
 return item;
end $$;
revoke all on function private.change_cart(uuid,uuid,integer,boolean) from public,anon,authenticated;
create or replace function public.add_cart_item(tenant uuid, variant uuid, quantity_to_add integer) returns uuid language sql security definer set search_path='' as $$ select private.change_cart(tenant,variant,quantity_to_add,true) $$;
create function public.set_cart_item(tenant uuid, variant uuid, quantity_value integer) returns uuid language sql security definer set search_path='' as $$ select private.change_cart(tenant,variant,quantity_value,false) $$;
revoke all on function public.add_cart_item(uuid,uuid,integer),public.set_cart_item(uuid,uuid,integer) from public,anon;
grant execute on function public.add_cart_item(uuid,uuid,integer),public.set_cart_item(uuid,uuid,integer) to authenticated;

-- Private helpers are not PostgREST RPCs. Anon needs only the catalog predicates.
revoke execute on all functions in schema private from public,anon;
grant execute on function private.public_marketplace(uuid),private.public_seller(uuid,uuid),private.public_product(uuid,uuid),private.seller_access(uuid,uuid),private.product_access(uuid,uuid),private.manages(uuid),private.is_admin(),private.is_owner(uuid) to anon;
-- RLS policies evaluate their predicates as the caller. Transitive calls happen as
-- the definer; authenticated callers retain only the original predicate grants.

-- Authenticated DTO views cast before the PostgreSQL -> JSON boundary, including drafts.
do $$ declare t text; projection text; begin
 foreach t in array array['products','product_variants','orders','order_items'] loop
  select string_agg(case when a.attname like '%\_amount' escape '\' then format('%I::text as %I',a.attname,a.attname) else format('%I',a.attname) end,',' order by a.attnum)
  into projection from pg_attribute a where a.attrelid=('public.'||t)::regclass and a.attnum>0 and not a.attisdropped;
  execute format('create view public.secure_%I with (security_invoker=true) as select %s from public.%I',t,projection,t);
  execute format('revoke all on public.secure_%I from public,anon,authenticated',t);
  execute format('grant select on public.secure_%I to authenticated',t);
 end loop;
end $$;
revoke all on function private.create_profile(),private.guard_update() from public,anon,authenticated;

-- Security-invoker transaction: application checks + RLS + tenant-safe FKs all apply.
create or replace function public.save_listing(tenant uuid, seller uuid, product uuid, category uuid, title text, description text, amount bigint, inventory integer, visibility text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid; code text;
begin
 if title is null or length(btrim(title)) not between 1 and 120 or description is null or length(description)>10000
 or amount is null or amount not between 0 and 9007199254740991 or inventory is null or inventory not between 0 and 1000000
 or visibility is null or visibility not in ('active','draft') then raise exception 'Invalid listing' using errcode='23514'; end if;
 if not private.seller_access(tenant,seller) then raise exception 'Not permitted' using errcode='42501'; end if;
 select currency into code from public.marketplaces where id=tenant;
 if product is null then
  insert into public.products(marketplace_id,seller_id,category_id,name,description,price_amount,currency,status,image_url)
  values(tenant,seller,category,title,description,amount,code,visibility,'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=85') returning id into result;
  insert into public.product_variants(marketplace_id,product_id,name,sku,price_amount,currency,stock)
  values(tenant,result,'Original','SKU-'||result::text,amount,code,inventory);
 else
  update public.products set category_id=category,name=title,description=save_listing.description,price_amount=amount,status=visibility
  where marketplace_id=tenant and id=product and seller_id=seller returning id into result;
  if result is null then raise exception 'Listing unavailable' using errcode='42501'; end if;
  update public.product_variants set price_amount=amount,stock=inventory where marketplace_id=tenant and product_id=product and name='Original';
  if not found then raise exception 'Original variant missing' using errcode='23514'; end if;
 end if;
 return result;
end $$;
revoke all on function public.save_listing(uuid,uuid,uuid,uuid,text,text,bigint,integer,text) from public,anon;
grant execute on function public.save_listing(uuid,uuid,uuid,uuid,text,text,bigint,integer,text) to authenticated;

revoke all on public.catalog_products,public.catalog_variants from public,anon,authenticated;
grant select on public.catalog_products,public.catalog_variants to anon,authenticated;
revoke execute on function private.is_owner(uuid) from anon;

create or replace function public.start_conversation(tenant uuid, seller uuid, subject text) returns uuid language plpgsql security definer set search_path='' as $$
declare conversation uuid; seller_user uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform 1 from public.marketplaces where id=tenant for share;
 select user_id into seller_user from public.sellers where marketplace_id=tenant and id=seller for share;
 if not found or not private.public_seller(tenant,seller) then raise exception 'Not permitted' using errcode='42501'; end if;
 insert into public.conversations(marketplace_id,seller_id,subject,created_by) values(tenant,seller,subject,auth.uid()) returning id into conversation;
 insert into public.conversation_participants(marketplace_id,conversation_id,user_id) values(tenant,conversation,auth.uid()),(tenant,conversation,seller_user) on conflict do nothing;
 return conversation;
end $$;
revoke all on function public.start_conversation(uuid,uuid,text) from public,anon;
grant execute on function public.start_conversation(uuid,uuid,text) to authenticated;
