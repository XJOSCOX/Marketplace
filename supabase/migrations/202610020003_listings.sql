-- Security-invoker transaction: application checks + RLS + tenant-safe FKs all apply.
create function public.save_listing(tenant uuid, seller uuid, product uuid, category uuid, title text, description text, amount bigint, inventory integer, visibility text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid; code text;
begin
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
 end if;
 return result;
end $$;
revoke all on function public.save_listing(uuid,uuid,uuid,uuid,text,text,bigint,integer,text) from public,anon;
grant execute on function public.save_listing(uuid,uuid,uuid,uuid,text,text,bigint,integer,text) to authenticated;
