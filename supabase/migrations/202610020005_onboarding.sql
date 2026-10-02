-- Phase 3: draft tenant lifecycle and controlled storefront configuration.
alter table public.marketplaces
 add column description text not null default '' check(length(description)<=5000),
 add column location text not null default '' check(length(location)<=200),
 add column hero_heading text not null default '' check(length(hero_heading)<=160),
 add column hero_description text not null default '' check(length(hero_description)<=500),
 add column logo_path text,
 add column branding_completed_at timestamptz,
 add column store_completed_at timestamptz,
 add column previewed_at timestamptz;
alter table public.products add column image_path text;
alter table public.categories add column sort_order integer not null default 0 check(sort_order between 0 and 10000);
alter table public.categories drop constraint categories_status_check;
alter table public.categories add constraint categories_status_check check(status in ('active','draft','archived'));
alter table public.marketplaces add constraint logo_tenant_path check(logo_path is null or logo_path ~ ('^marketplaces/'||id::text||'/logo/[0-9a-f-]{36}\.webp$'));
alter table public.products add constraint image_tenant_path check(image_path is null or image_path ~ ('^marketplaces/'||marketplace_id::text||'/products/'||id::text||'/[0-9a-f-]{36}\.webp$'));

-- Draft management is allowed; suspended tenants remain blocked. Public predicates
-- continue requiring active status and never treat draft management as publication.
create or replace function private.has_role(tenant uuid, allowed text[]) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or exists(select 1 from public.marketplace_memberships mm join public.marketplaces m on m.id=mm.marketplace_id
 where mm.marketplace_id=tenant and mm.user_id=auth.uid() and mm.status='active' and m.status in ('draft','active')
 and exists(select 1 from unnest(mm.roles) r where r=any(allowed) and (r<>'marketplace_owner' or m.owner_user_id=mm.user_id)))
$$;
create or replace function private.is_owner(tenant uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or (exists(select 1 from public.marketplaces where id=tenant and owner_user_id=auth.uid() and status in ('draft','active')) and private.has_role(tenant,array['marketplace_owner']))
$$;
alter policy marketplaces_read on public.marketplaces using(status='active' or private.manages(id));
grant update(description,location,hero_heading,hero_description,logo_path) on public.marketplaces to authenticated;
grant update(image_path) on public.products to authenticated;

-- Every creation path remains atomic and derives ownership from the session.
drop function public.create_marketplace(text,text,text,text);
create function public.create_marketplace(requested_slug text,title text,marketplace_mode text,currency_code text default 'USD',branding jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); tenant uuid; seller uuid; normalized text;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 normalized:=lower(btrim(requested_slug));
 if normalized is null or length(normalized) not between 1 and 80 or normalized !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or title is null or length(btrim(title)) not between 1 and 120
 or marketplace_mode is null or marketplace_mode not in ('STORE','MARKETPLACE','HYBRID') or currency_code is distinct from 'USD'
 or branding is null or jsonb_typeof(branding)<>'object' or exists(select 1 from jsonb_each(branding) e where e.key not in ('tagline','description','accent','location') or jsonb_typeof(e.value)<>'string') then raise exception 'Invalid marketplace' using errcode='23514'; end if;
 insert into public.marketplaces(slug,name,mode,owner_user_id,status,currency,tagline,description,accent,location,hero_heading,hero_description,branding_completed_at)
 values(normalized,btrim(title),marketplace_mode,actor,'draft',currency_code,coalesce(branding->>'tagline',''),coalesce(branding->>'description',''),coalesce(branding->>'accent','#27624c'),coalesce(branding->>'location',''),btrim(title),coalesce(branding->>'tagline',''),case when coalesce(branding->>'description','')<>'' then now() end) returning id into tenant;
 insert into public.marketplace_memberships(marketplace_id,user_id,roles) values(tenant,actor,array['buyer','marketplace_owner']);
 if marketplace_mode in ('STORE','HYBRID') then
  insert into public.sellers(marketplace_id,user_id,name,status) values(tenant,actor,btrim(title),'active') returning id into seller;
  insert into public.stores(marketplace_id,seller_id,slug,name) values(tenant,seller,normalized,btrim(title));
  update public.marketplace_memberships set roles=array['buyer','seller','marketplace_owner'] where marketplace_id=tenant and user_id=actor;
 end if;
 return tenant;
end $$;
revoke all on function public.create_marketplace(text,text,text,text,jsonb) from public,anon;
grant execute on function public.create_marketplace(text,text,text,text,jsonb) to authenticated;

create function public.complete_setup(tenant uuid, step text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_owner(tenant) then raise exception 'Not permitted' using errcode='42501'; end if;
 if step='branding' then
  update public.marketplaces set branding_completed_at=now() where id=tenant and length(btrim(name))>0 and length(btrim(description))>0 and length(btrim(hero_heading))>0;
 elsif step='store' then
  update public.marketplaces set store_completed_at=now() where id=tenant and length(btrim(description))>0;
 elsif step='preview' then update public.marketplaces set previewed_at=now() where id=tenant;
 else raise exception 'Invalid step' using errcode='23514'; end if;
 if not found then raise exception 'Complete required fields' using errcode='23514'; end if;
end $$;
create function public.publish_marketplace(tenant uuid, publish boolean) returns void language plpgsql security definer set search_path='' as $$
declare m public.marketplaces;
begin
 if auth.uid() is null or not private.is_owner(tenant) or publish is null then raise exception 'Not permitted' using errcode='42501'; end if;
 select * into m from public.marketplaces where id=tenant for update;
 if m.status='suspended' then raise exception 'Marketplace suspended' using errcode='42501'; end if;
 if publish and (length(btrim(m.description))=0 or length(btrim(m.hero_heading))=0 or m.branding_completed_at is null or m.store_completed_at is null or m.previewed_at is null or not exists(select 1 from public.categories where marketplace_id=tenant and status='active')) then raise exception 'Complete setup before publishing' using errcode='23514'; end if;
 -- A MARKETPLACE must publish before third parties can apply; inventory may come later.
 if publish and m.mode<>'MARKETPLACE' and not exists(select 1 from public.products p join public.sellers s on s.marketplace_id=p.marketplace_id and s.id=p.seller_id join public.categories c on c.marketplace_id=p.marketplace_id and c.id=p.category_id where p.marketplace_id=tenant and p.status='active' and s.status='active' and s.user_id=m.owner_user_id and c.status='active') then raise exception 'Publish an owner product first' using errcode='23514'; end if;
 update public.marketplaces set status=case when publish then 'active' else 'draft' end where id=tenant;
end $$;
revoke all on function public.complete_setup(uuid,text),public.publish_marketplace(uuid,boolean) from public,anon;
grant execute on function public.complete_setup(uuid,text),public.publish_marketplace(uuid,boolean) to authenticated;

-- Additional listing fields remain transactional and seller/tenant authorized.
drop function public.save_listing(uuid,uuid,uuid,uuid,text,text,bigint,integer,text);
create function public.save_listing(tenant uuid,seller uuid,product uuid,category uuid,title text,description text,amount bigint,inventory integer,visibility text,sku_code text default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid; code text;
begin
 if not private.seller_access(tenant,seller) then raise exception 'Not permitted' using errcode='42501'; end if;
 if title is null or length(btrim(title)) not between 1 and 120 or description is null or length(description)>10000 or amount is null or amount not between 0 and 9007199254740991 or inventory is null or inventory not between 0 and 1000000 or visibility is null or visibility not in ('active','draft','archived') or (sku_code is not null and (length(sku_code) not between 1 and 80 or sku_code !~ '^[A-Za-z0-9._-]+$')) then raise exception 'Invalid listing' using errcode='23514'; end if;
 select currency into code from public.marketplaces where id=tenant;
 if product is null then
  insert into public.products(marketplace_id,seller_id,category_id,name,description,price_amount,currency,status) values(tenant,seller,category,title,description,amount,code,visibility) returning id into result;
  insert into public.product_variants(marketplace_id,product_id,name,sku,price_amount,currency,stock) values(tenant,result,'Original',coalesce(sku_code,'SKU-'||result::text),amount,code,inventory);
 else
  update public.products set category_id=category,name=title,description=save_listing.description,price_amount=amount,status=visibility where marketplace_id=tenant and id=product and seller_id=seller returning id into result;
  if result is null then raise exception 'Listing unavailable' using errcode='42501'; end if;
  update public.product_variants set price_amount=amount,stock=inventory,sku=coalesce(sku_code,sku) where marketplace_id=tenant and product_id=product and name='Original';
  if not found then raise exception 'Original variant missing' using errcode='23514'; end if;
 end if;
 return result;
end $$;
revoke all on function public.save_listing(uuid,uuid,uuid,uuid,text,text,bigint,integer,text,text) from public,anon;
grant execute on function public.save_listing(uuid,uuid,uuid,uuid,text,text,bigint,integer,text,text) to authenticated;

-- Recreate projections after adding the image path. Existing column order is preserved.
create or replace view public.catalog_products with(security_invoker=true) as select p.id,p.marketplace_id,p.seller_id,p.category_id,p.name,p.description,p.image_url,p.price_amount::text as price_amount,p.currency,p.created_at,p.image_path from public.products p where private.public_product(p.marketplace_id,p.id);
create or replace view public.secure_products with(security_invoker=true) as select id,marketplace_id,seller_id,category_id,name,description,image_url,status,price_amount::text as price_amount,currency,created_at,updated_at,image_path from public.products;

create policy marketplaces_seller_read on public.marketplaces for select to authenticated using(private.has_role(id,array['seller']));

create policy categories_seller_read on public.categories for select to authenticated using(status='active' and private.has_role(marketplace_id,array['seller']));
create unique index variants_one_original on public.product_variants(marketplace_id,product_id) where name='Original';
