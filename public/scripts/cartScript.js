$(document).ready(() => {
    const formatVND = (value) => {
        const num = Number(value) || 0;
        return num.toLocaleString('vi-VN') + ' vnđ';
    };

    const updateSelectionSummary = () => {
        let count = 0;
        let total = 0;
        document.querySelectorAll('.cart-item-select:checked').forEach((el) => {
            count += 1;
            const price = Number(el.getAttribute('data-price')) || 0;
            const qty = Number(el.getAttribute('data-qty')) || 1;
            total += price * qty;
        });
        const btn = document.getElementById('btnCartCheckout');
        const c = document.getElementById('selectedCount');
        const t = document.getElementById('selectedTotal');
        const gt = document.getElementById('selectedGrandTotal');
        if (c) c.textContent = String(count);
        if (t) t.textContent = formatVND(total);
        if (gt) gt.textContent = formatVND(total);
        if (btn) btn.disabled = count === 0;
    };

    // Bind change events for selection
    document.addEventListener('change', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('cart-item-select')) {
            updateSelectionSummary();
        }
    });

    // Checkout with selected items only
    const btnCheckout = document.getElementById('btnCartCheckout');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            const selected = Array.from(document.querySelectorAll('.cart-item-select:checked')).map(el => el.value);
            if (!selected.length) {
                Swal.fire('Chưa chọn sản phẩm', 'Vui lòng tích chọn sản phẩm để thanh toán.', 'warning');
                return;
            }
            const url = `/cart/checkout?items=${encodeURIComponent(selected.join(','))}`;
            location.assign(url);
        });
    }

    // Initial summary
    // Auto-select items if query contains ?select=<id1,id2>
    try {
        const params = new URLSearchParams(window.location.search);
        const selectParam = (params.get('select') || '').trim();
        if (selectParam) {
            const selected = new Set(selectParam.split(',').map(s => s.trim()).filter(Boolean));
            document.querySelectorAll('.cart-item-select').forEach((el) => {
                el.checked = selected.has(String(el.value));
            });
        }
    } catch (e) {
        // ignore
    }

    updateSelectionSummary();

    addToCart = async (productID) => {
        return await fetch(`/cart/add-to-cart/${productID}`, {
            method: 'GET'
        })
            .then(response => response.json())
            .then(data => {
                if (data.status) {
                    let cartCount = document.getElementById('cartCount');
                    if (cartCount) {
                        cartCount.innerText = data.count
                    }
                    return true;
                }

                // status=false usually means "already in cart".
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Sản phẩm đã có trong giỏ', 'Bạn có thể tăng số lượng trong giỏ hàng.', 'info');
                }
                return false;
            })
            .catch(() => false);
    },
        removeFromCart = async (product_ID) => {
            Swal.fire({
                title: 'Are you sure?',
                text: `Are you sure want to remove this product from cart`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, Remove it!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await fetch(`/cart/remove-from-cart/${product_ID}`, {
                        method: 'GET'
                    }).then(response => response.json())
                        .then(data => {
                            if (data.status) {
                                location.assign('/cart');
                            }
                        })
                }
            })
        }

    // Increase quantity
    increaseCartQuantity = async (productID) => {

        try {
            const response = await fetch(`/cart/add-quantity/${productID}`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const quantityInput = document.querySelector(`#quantityInput-${productID}`);
                    const currentQuantity = parseInt(quantityInput.value);
                    quantityInput.value = currentQuantity + 1;
                    location.assign('/cart');
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Limited Stock!',
                        text: 'The item you selected has only a limited quantity available.'
                    })
                }
            } else {
                // Handle fetch errors here
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Decrease quantity
    decreaseCartQuantity = async (productId) => {

        try {
            const quantityInput = document.querySelector(`#quantityInput-${productId}`);
            const currentQuantity = parseInt(quantityInput.value);

            if (currentQuantity <= 1) {
                return;
            }

            const response = await fetch(`/cart/minus-quantity/${productId}`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    quantityInput.value = currentQuantity - 1;
                    location.assign('/cart');
                }
            } else {
                // Handle fetch errors here
            }
        } catch (error) {
            console.error(error);
        }
    }

    //add to wish list function
    addToWishlist = async (id) => {
        const heart = document.getElementById(`heart${id}`);
        await fetch(`/view_product/add-to-wishlist/${id}`, {
            method: 'GET'
        }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    heart.classList.remove("fa-regular")
                    heart.classList.add("fa-solid")
                    heart.classList.add("text-danger")

                } else {
                    heart.classList.remove("fa-solid")
                    heart.classList.remove("text-danger")
                    heart.classList.add("fa-regular")

                }
            })
    }

        // Recommendations rendering on cart page
        (function initRecommendations(){
                const grid = document.getElementById('recGrid');
                const empty = document.getElementById('recEmpty');
                if (!grid) return;
                fetch('/recommendations?limit=8').then(r=>r.json()).then(data => {
                        if (!data || !data.success) return;
                        const items = Array.isArray(data.items) ? data.items : [];
                        if (!items.length) {
                                if (empty) empty.style.display = 'block';
                                return;
                        }
                        grid.innerHTML = '';
                        items.forEach(p => {
                                const col = document.createElement('div');
                                col.className = 'col-6 col-md-3';
                                col.innerHTML = `
                                    <div class="card h-100 product-card">
                                        <div class="position-relative">
                                            <span class="badge bg-secondary position-absolute top-0 end-0" style="z-index:1;">${formatVND(p.selling_price)}</span>
                                            <img src="/productImages/${p?.primary_image?.name || ''}" class="card-img-top" alt="${p.product_name}" />
                                        </div>
                                        <div class="card-body d-flex flex-column">
                                            <h6 class="card-title" title="${p.product_name}">${p.product_name}</h6>
                                            <p class="card-text text-muted" style="margin-top:auto">${p.brand_name || ''}</p>
                                            <div class="d-flex" style="gap:.5rem;">
                                                <a class="btn btn-outline-primary btn-sm" href="/view_product/${p._id}">Xem</a>
                                                <button class="btn btn-primary btn-sm" onclick="addToCart('${p._id}')">Thêm</button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                grid.appendChild(col);
                        });
                }).catch(()=>{});
        })();
})
