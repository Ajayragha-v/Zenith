def process_order(price, quantity, is_vip, has_coupon, is_holiday):
    # Rule 3 will extract this massive boolean condition
    if price > 0 and quantity > 0 and is_vip and has_coupon and not is_holiday:
        
        # Rule 2 will convert these nested if/else blocks into Guard Clauses
        if price > 100:
            if quantity > 5:
                if is_vip:
                    if has_coupon:
                        return "Large VIP Coupon Order"
                    else:
                        return "Large VIP Order"
                else:
                    return "Large Order"
            else:
                return "Small VIP Order"
        else:
            return "Standard VIP Order"
    else:
        return "Standard Order"

print(process_order(150, 10, True, True, False))