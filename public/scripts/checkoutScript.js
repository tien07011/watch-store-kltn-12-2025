$(document).ready(() => {
    const formatVND = (value) => {
        const num = Number(value) || 0;
        return num.toLocaleString('vi-VN') + ' vnđ';
    };

    // Initial UI state
    $('.add-form').hide();
    $('.payment-options').hide();
    $('.coupenss').hide();
    $('.description').hide();
    $('.know-less').hide();

    // Expand/collapse address form
    const addAddress = document.getElementById('addAddress');
    if (addAddress) {
        addAddress.addEventListener('click', (e) => {
            e.preventDefault();
            $('.add-form').slideDown(() => {
                document.querySelector('.add-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }
    const upButton = document.getElementById('upButton');
    if (upButton) {
        upButton.addEventListener('click', (e) => {
            e.preventDefault();
            $('.add-form').slideUp();
        });
    }

    // Proceed to payment
    const proceedPayment = document.getElementById('proceedPayment');
    if (proceedPayment) {
        proceedPayment.addEventListener('click', (e) => {
            e.preventDefault();
            const selected = document.querySelector('input[name="address"]:checked');
            if (!selected) {
                Swal.fire('Thiếu thông tin', 'Vui lòng chọn địa chỉ giao hàng.', 'warning');
                return;
            }
            $('#proceedPayment').hide();
            $('.payment-options').slideDown();
        });
    }

    // Create order
    const submitOrder = document.getElementById('submitOrder');
    if (submitOrder) {
        submitOrder.addEventListener('click', async (e) => {
            e.preventDefault();
            const form = document.getElementById('orderForm');
            const selectedAddress = document.querySelector('input[name="address"]:checked');
            const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
            if (!selectedAddress) {
                Swal.fire('Thiếu thông tin', 'Vui lòng chọn địa chỉ giao hàng.', 'warning');
                return;
            }
            if (!selectedPayment) {
                Swal.fire('Thiếu thông tin', 'Vui lòng chọn phương thức thanh toán.', 'warning');
                return;
            }
            if (form) {
                let formData = new FormData(form);
                const body = Object.fromEntries(formData);
                $('#submitOrder').prop('disabled', true).addClass('button-cancel');
                try {
                    const res = await fetch('/cart/place-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const data = await res.json();
                    if (data.success) {
                        location.assign('/cart/order-success');
                        return;
                    }
                    if (data.status && data.payUrl) {
                        location.assign(data.payUrl);
                        return;
                    }
                    Swal.fire('Có lỗi', 'Không thể tạo đơn hàng, vui lòng thử lại.', 'error');
                } catch (err) {
                    Swal.fire('Có lỗi', 'Kết nối thất bại, vui lòng thử lại.', 'error');
                } finally {
                    $('#submitOrder').prop('disabled', false).removeClass('button-cancel');
                }
            } else {
                console.error('Form element not found');
            }
        });
    }

    // Coupon modal open/close
    $('#checkCoupen').on('click', () => {
        $('.coupenss').fadeIn(120);
        $('#coupensBackdrop').show();
        $('#proceedPayment').hide();
        $('#submitOrder').hide();
    });
    $('#back, #coupensBackdrop').on('click', () => {
        $('.coupenss').fadeOut(120);
        $('#coupensBackdrop').hide();
        $('#proceedPayment').show();
        $('#submitOrder').show();
    });

    // Toggle coupon description per card (delegated)
    $('.coupenss').on('click', '.know-more', function () {
        const card = $(this).closest('.card');
        card.find('.description').show();
        card.find('.know-more').hide();
        card.find('.know-less').show();
    });
    $('.coupenss').on('click', '.know-less', function () {
        const card = $(this).closest('.card');
        card.find('.description').hide();
        card.find('.know-more').show();
        card.find('.know-less').hide();
    });

    // apply coupen
    applayCoupen = async (id) => {
        const priceEl = document.getElementById('price');
        const total = priceEl ? priceEl.value : 0;
        await fetch(`/cart/checkout?coupen=${id}&total=${total}`)
            .then((response) => response.json())
            .then(data => {
                if (data.success) {
                    const newTotalAmount = data.total;
                    const productsElement = document.querySelector('.list-group-item:nth-child(1) span');
                    const shippingElement = document.querySelector('.list-group-item:nth-child(2) span');
                    const Showdiscount = document.getElementById('showDiscount');
                    const totalAmountElement = document.querySelector('.list-group-item:nth-child(4) span strong');
                    document.getElementById('price').value = newTotalAmount;
                    document.getElementById('coupen').value = id;
                    document.getElementById('discount').value = data.discount;
                    document.getElementById('coupen_code').value = data.coupen_code;
                    if (productsElement) productsElement.textContent = formatVND(newTotalAmount);
                    if (shippingElement) shippingElement.textContent = formatVND(0);
                    if (totalAmountElement) totalAmountElement.textContent = formatVND(newTotalAmount);
                    if (Showdiscount) Showdiscount.textContent = `${data.discount}%`;
                    $('.coupenss').fadeOut(120);
                    $('#coupensBackdrop').hide();
                    $('#proceedPayment').show();
                    $('#submitOrder').show();
                } else {
                    Swal.fire('Có lỗi', `Bạn cần mua tối thiểu ${formatVND(data.min_amount)} để áp dụng mã này.`, 'error');
                }
            });
    }
});
