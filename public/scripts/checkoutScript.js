$(document).ready(() => {
        const formatVND = (value) => {
            const num = Number(value) || 0;
            return num.toLocaleString('vi-VN') + ' vnđ';
        };
    $('.add-form').hide();
    $('.payment-options').hide();

    $('.description').hide();
    $('.know-less').hide();
    $('.know-more').on('click', () => {
        $('.description').show();
        $('.know-more').hide();
        $('.know-less').show();
    });
    $('.know-less').on('click', () => {
        $('.description').hide();
        $('.know-more').show();
        $('.know-less').hide();
    })


    //add new Address form display
    const addAddress = document.getElementById('addAddress');
    if (addAddress) {
        addAddress.addEventListener('click', (e) => {
            e.preventDefault();
            $('.add-form').slideDown();

        })
    }
    //go up address
    const upButton = document.getElementById('upButton');
    if (upButton) {
        upButton.addEventListener('click', (e) => {
            e.preventDefault();
            $('.add-form').slideUp();
        })
    }

    const proceedPayment = document.getElementById('proceedPayment');
    if (proceedPayment) {
        proceedPayment.addEventListener('click', (e) => {
            e.preventDefault;
            $('#proceedPayment').hide();
            $('.payment-options').slideDown();
        })
    }

    //create order
    const submitOrder = document.getElementById('submitOrder');
    if (submitOrder) {
        submitOrder.addEventListener('click', async (e) => {
            e.preventDefault();
            let form = document.getElementById('orderForm');
            if (form) {
                let formData = new FormData(form);
                const body = Object.fromEntries(formData);
                await fetch('/cart/place-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }).then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            location.assign('/cart/order-success')
                        }
                        if (data.status && data.payUrl) {
                            // Redirect to MoMo payment page
                            location.assign(data.payUrl);
                        }
                    })

            } else {
                console.error('Form element not found');
            }
        });
    }

    // MoMo flow uses server-side redirect; no Razorpay popup

    $('.coupenss').hide();
    $('#checkCoupen').on('click', () => {
        $('.coupenss').show();
        $('#coupensBackdrop').show();
        $('#proceedPayment').hide();
        $('#submitOrder').hide();
    });
    $('#back').on('click', () => {
        $('.coupenss').hide();
        $('#coupensBackdrop').hide();
        $('#proceedPayment').show();
        $('#submitOrder').show();
    });



    // apply coupen 
    applayCoupen = async (id) => {
        // /cart/checkout
        let total = document.getElementById('price').value;
        await fetch(`/cart/checkout?coupen=${id}&total=${total}`)
            .then((response) => response.json())
            .then(data => {
                if (data.success) {
                    const newTotalAmount = data.total;
                    const productsElement = document.querySelector('.list-group-item:nth-child(1) span');
                    const shippingElement = document.querySelector('.list-group-item:nth-child(2) span');
                    const Showdiscount = document.getElementById('showDiscount')
                    const totalAmountElement = document.querySelector('.list-group-item:nth-child(4) span strong');
                    let price = document.getElementById('price');
                    price.value = newTotalAmount
                    let coupen = document.getElementById('coupen');
                    coupen.value = id;
                    let discount = document.getElementById('discount');
                    discount.value = data.discount
                    let coupen_code = document.getElementById('coupen_code');
                    coupen_code.value = data.coupen_code
                    productsElement.textContent = formatVND(newTotalAmount);
                    shippingElement.textContent = formatVND(0);
                    totalAmountElement.textContent = formatVND(newTotalAmount);
                    Showdiscount.textContent = `${data.discount}%`
                    console.log(Showdiscount);
                    $('.coupenss').hide();
                    $('#coupensBackdrop').hide();
                    $('#proceedPayment').show();
                    $('#submitOrder').show();
                } else {
                    Swal.fire(
                        'Có lỗi',
                        `Bạn cần mua tối thiểu ${formatVND(data.min_amount)} để áp dụng mã này.`,
                        'error'
                    );
                }
            })
    }
})
