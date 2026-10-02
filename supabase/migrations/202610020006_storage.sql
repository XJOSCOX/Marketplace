-- Private buckets. App image endpoint validates/normalizes bytes on upload and read.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('marketplace-assets','marketplace-assets',false,5242880,array['image/webp']),
 ('product-images','product-images',false,5242880,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function private.asset_access(bucket text, object_name text, writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare pieces text[]:=string_to_array(object_name,'/'); tenant uuid; product uuid;
begin
 if pieces[1]<>'marketplaces' or pieces[2] is null or pieces[2] !~ '^[0-9a-f-]{36}$' then return false; end if;
 tenant:=pieces[2]::uuid;
 if bucket='marketplace-assets' and array_length(pieces,1)=4 and pieces[3]='logo' and pieces[4] ~ '^[0-9a-f-]{36}\.webp$' then
  return case when writing then auth.uid() is not null and private.is_owner(tenant) else private.manages(tenant) or exists(select 1 from public.marketplaces where id=tenant and status='active' and logo_path=object_name) end;
 elsif bucket='product-images' and array_length(pieces,1)=5 and pieces[3]='products' and pieces[4] ~ '^[0-9a-f-]{36}$' and pieces[5] ~ '^[0-9a-f-]{36}\.webp$' then
  product:=pieces[4]::uuid;
  return case when writing then auth.uid() is not null and private.product_access(tenant,product) else private.product_access(tenant,product) or (private.public_product(tenant,product) and exists(select 1 from public.products where marketplace_id=tenant and id=product and image_path=object_name)) end;
 end if;
 return false;
exception when invalid_text_representation then return false;
end $$;
revoke all on function private.asset_access(text,text,boolean) from public;
grant execute on function private.asset_access(text,text,boolean) to anon,authenticated;
create policy commerce_assets_read on storage.objects for select to anon,authenticated using(private.asset_access(bucket_id,name,false));
create policy commerce_assets_insert on storage.objects for insert to authenticated with check(private.asset_access(bucket_id,name,true));
-- Unique immutable names; no UPDATE policy. Deletion requires current resource access.
create policy commerce_assets_delete on storage.objects for delete to authenticated using(private.asset_access(bucket_id,name,true));
-- Restrictive guards prevent unrelated pre-existing permissive Storage policies
-- from widening access to these commerce buckets. Other buckets are unaffected.
create policy commerce_assets_read_guard on storage.objects as restrictive for select to anon,authenticated using(bucket_id not in ('marketplace-assets','product-images') or private.asset_access(bucket_id,name,false));
create policy commerce_assets_insert_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id not in ('marketplace-assets','product-images') or private.asset_access(bucket_id,name,true));
create policy commerce_assets_update_guard on storage.objects as restrictive for update to authenticated using(bucket_id not in ('marketplace-assets','product-images')) with check(bucket_id not in ('marketplace-assets','product-images'));
create policy commerce_assets_delete_guard on storage.objects as restrictive for delete to authenticated using(bucket_id not in ('marketplace-assets','product-images') or private.asset_access(bucket_id,name,true));
