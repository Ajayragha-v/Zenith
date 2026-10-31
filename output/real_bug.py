def process_order(price, quantity, is_vip, has_coupon, is_holiday):
    if not (price > 0 and quantity > 0 and is_vip and has_coupon and (not is_holiday)):
        return 'Standard Order'
    if not price > 100:
        return 'Standard VIP Order'
    if not quantity > 5:
        return 'Small VIP Order'
    if not is_vip:
        return 'Large Order'
    if not has_coupon:
        return 'Large VIP Order'
    return 'Large VIP Coupon Order'
print(process_order(150, 10, True, True, False))