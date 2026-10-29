def calculate_total(price, tax=10):
    # Bug: 'tax' is not defined
    return price + tax

print(calculate_total(100))