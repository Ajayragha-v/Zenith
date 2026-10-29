from real_bug import calculate_total

def test_calculate_total():
    result = calculate_total(100)
    if result != 80:
        raise ValueError("The calculation is wrong!")