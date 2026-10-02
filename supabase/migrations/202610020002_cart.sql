-- Atomic cart addition: caller supplies only tenant, variant and quantity, never a price.
create function public.add_cart_item(tenant uuid, variant uuid, quantity_to_add integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v public.product_variants; cart uuid; item uuid; existing integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if quantity_to_add not between 1 and 999 or quantity_to_add is null then raise exception 'Invalid quantity' using errcode='23514'; end if;
 select * into v from public.product_variants where marketplace_id=tenant and id=variant and status='active' for update;
 if not found or not private.public_product(tenant,v.product_id) then raise exception 'Variant unavailable' using errcode='42501'; end if;
 insert into public.carts(marketplace_id,user_id) values(tenant,auth.uid()) on conflict(marketplace_id,user_id) do update set updated_at=now() returning id into cart;
 select quantity into existing from public.cart_items where marketplace_id=tenant and cart_id=cart and variant_id=variant;
 if coalesce(existing,0)+quantity_to_add > least(v.stock,999) then raise exception 'Quantity unavailable' using errcode='23514'; end if;
 insert into public.cart_items(marketplace_id,cart_id,product_id,variant_id,quantity) values(tenant,cart,v.product_id,variant,quantity_to_add)
 on conflict(cart_id,variant_id) do update set quantity=public.cart_items.quantity+quantity_to_add returning id into item;
 return item;
end $$;
revoke all on function public.add_cart_item(uuid,uuid,integer) from public,anon;
grant execute on function public.add_cart_item(uuid,uuid,integer) to authenticated;
