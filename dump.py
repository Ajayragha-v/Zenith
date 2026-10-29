def calculate_total(price, discount):
    if discount is None:
        return price
    return price - (price * discount)