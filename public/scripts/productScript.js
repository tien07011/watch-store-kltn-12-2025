// Format prices to Vietnamese style: 1.500.000 vnđ
function formatVND(value) {
    const n = Number(String(value ?? '').replace(/[^0-9-]/g, ''));
    if (!Number.isFinite(n)) return value;
    // format with dot as thousand separator
    const formatted = n.toLocaleString('vi-VN');
    return formatted + ' vnđ';
}

function applyPriceFormatting() {
    // format elements with class .product-price
    document.querySelectorAll('.product-price').forEach(el => {
        const raw = el.textContent;
        el.textContent = formatVND(raw);
    });
    // format price badges inside product cards (right-top badge)
    document.querySelectorAll('.product-card .price-badge').forEach(el => {
        el.textContent = formatVND(el.textContent);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    applyPriceFormatting();
    initClientSearchAndSort();
});

function initClientSearchAndSort(){
    const input = document.getElementById('smart-search-input');
    const sortRadios = document.querySelectorAll('.filter-sort');
    const catChecks = document.querySelectorAll('.filter-button');
    const brandChecks = document.querySelectorAll('.filter-brand');
    const colorChecks = document.querySelectorAll('.filter-color');
    const grid = document.querySelector('.product-grid');

    // Sync UI from URL params if present
    (function syncFromParams(){
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const sort = params.get('sort');
        const cats = params.getAll('category');
        const brands = params.getAll('brand');
        const colors = params.getAll('color');

        if (q && input) input.value = q;
        if (sort){
            sortRadios.forEach(r => { r.checked = (r.value.split('=')[1] === sort); });
        }
        if (cats.length){
            catChecks.forEach(c => {
                const val = c.value.split('=')[1];
                c.checked = cats.includes(val);
            });
        }
        if (brands.length){
            brandChecks.forEach(c => {
                const val = c.value.split('=')[1];
                c.checked = brands.includes(val);
            });
        }
        if (colors.length){
            colorChecks.forEach(c => {
                const val = c.value.split('=')[1];
                c.checked = colors.includes(val);
            });
        }
    })();

    function getActiveFilters(){
        const cats = Array.from(catChecks).filter(c=>c.checked).map(c=>c.value.split('=')[1].toLowerCase());
        const brands = Array.from(brandChecks).filter(c=>c.checked).map(c=>c.value.split('=')[1].toLowerCase());
        const colors = Array.from(colorChecks).filter(c=>c.checked).map(c=>c.value.split('=')[1].toLowerCase());
        const sortVal = Array.from(sortRadios).find(r=>r.checked)?.value.split('=')[1] || null;
        const q = (input?.value || '').trim().toLowerCase();
        return { cats, brands, colors, sortVal, q };
    }

    function normalizeVN(str){
        return (str || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
    }

    function matchesFilters(card, filters){
        const name = card.getAttribute('data-name') || '';
        const brand = card.getAttribute('data-brand') || '';
        const color = card.getAttribute('data-color') || '';
        const categoryId = (card.getAttribute('data-category') || '').toLowerCase();
        const categoryName = normalizeVN(card.getAttribute('data-category-name') || '');
        const priceStr = card.getAttribute('data-price') || '0';
        const price = Number(priceStr);

        // text search across name, brand, color
        if (filters.q){
            const qn = normalizeVN(filters.q);
            const hay = normalizeVN(name + ' ' + brand + ' ' + color);
            if (!hay.includes(qn)) return false;
        }
        // category filter (server stores id; we only have id on data-category)
        if (filters.cats.length){
            const ok = filters.cats.some(c => {
                const cn = normalizeVN(c);
                return cn === categoryName || c === categoryId;
            });
            if (!ok) return false;
        }
        // brand filter
        if (filters.brands.length){
            const bn = normalizeVN(brand);
            const ok = filters.brands.some(b => normalizeVN(b) === bn);
            if (!ok) return false;
        }
        // color filter
        if (filters.colors.length){
            const cn = normalizeVN(color);
            const ok = filters.colors.some(c => normalizeVN(c) === cn);
            if (!ok) return false;
        }
        // price exists
        return Number.isFinite(price);
    }

    function sortCards(cards, sortVal){
        if (!sortVal) return cards;
        if (sortVal === 'low-high'){
            return cards.sort((a,b)=> Number(a.getAttribute('data-price')) - Number(b.getAttribute('data-price')));
        }
        if (sortVal === 'high-low'){
            return cards.sort((a,b)=> Number(b.getAttribute('data-price')) - Number(a.getAttribute('data-price')));
        }
        if (sortVal === 'new-first'){
            // if createdAt is available as data attr, use it; else keep order
            return cards;
        }
        return cards;
    }

    function render(){
        const filters = getActiveFilters();
        const cards = Array.from(document.querySelectorAll('.product-card'));
        const matched = cards.filter(c => matchesFilters(c, filters));
        const sorted = sortCards(matched, filters.sortVal);
        // clear grid and append
        if (grid){
            grid.innerHTML = '';
            sorted.forEach(c => grid.appendChild(c));
        }
    }

    // Bind events
    input?.addEventListener('input', ()=>{
        // debounce minimal
        clearTimeout(input.__t);
        input.__t = setTimeout(render, 200);
    });
    [...sortRadios, ...catChecks, ...brandChecks, ...colorChecks].forEach(el=>{
        el.addEventListener('change', render);
    });

    // initial
    render();
}
// /admin/products/add-product

$("#image").on("change", function () {
    if ($("#image")[0].files.length > 3) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'You can select maximum of 3 images'
        })
        $(this).val('')
    }
});

$('#primaryIMG').on('change', (e) => {
    let container = document.getElementById('crp-container')
    container.style.display = "block"
    let image = document.getElementById('images')
    let file = e.target.files[0]
    $('.btn-group').hide();
    if (file) {
        // Create a new FileReader to read the selected image file
        var reader = new FileReader(file);
        reader.onload = function (event) {
            // Set the source of the image element in the Cropper container
            document.getElementById('images').src = event.target.result;
            // Initialize Cropper.js with the updated image source
            let cropper = new Cropper(image, {
                aspectRatio: 1 / 1,
                viewMode: 0,
                autoCrop: true,
                background: false,
            })

            $('#cropImageBtn').on('click', function () {
                var cropedImg = cropper.getCroppedCanvas()
                if (cropedImg) {
                    cropedImg = cropedImg.toDataURL('image/png')
                    document.getElementById('prev').src = cropedImg
                    document.getElementById('result').value = cropedImg
                    container.style.display = "none"
                    $('.btn-group').show()
                }
                cropper.destroy();
            })
        };
        reader.readAsDataURL(file);
    }


})
$.validator.addMethod(
    "positive",
    function (value, element) {
        return parseFloat(value) >= 0;
    },
    "Please enter a positive number"
);

$.validator.addMethod(
    "lessThan100",
    function (value, element) {
        return parseFloat(value) <= 100;
    },
    "Please enter a percentage value."
);


$("#addProductForm").validate({
    rules: {
        product_name: {
            required: true,
            maxlength: 80,
        },
        brand_name: {
            required: true,
            maxlength: 15,
        },
        stock: {
            required: true,
            number: true,
            positive: true,
        },
        prod_price: {
            required: true,
            number: true,
            positive: true,
        },
        sellig_price: {
            required: true,
            number: true,
            positive: true,
        },
        GST: {
            required: true,
            number: true,
            positive: true,
            lessThan100: true,
        },
        color: {
            required: true,
        },
        description: {
            required: true,
        },
    },

    submitHandler: function (form) {
        Swal.fire({
            title: "Are you sure?",
            text: "You want to add new product?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#0061bc",
            cancelButtonColor: "rgb(128, 128, 128)",
            confirmButtonText: "Yes",
        }).then(async (result) => {
            if (result.isConfirmed) {
                const form = document.getElementById("addProductForm");
                try {
                    const formData = new FormData(form);
                    const base64String = document.getElementById("result").value;
                    const base64Data = base64String.split(",")[1];
                    const binaryData = atob(base64Data);
                    const uint8Array = new Uint8Array(
                        binaryData.length
                    );
                    for (let i = 0; i < binaryData.length; i++) {
                        uint8Array[i] = binaryData.charCodeAt(i);
                    }
                    const blob = new Blob([uint8Array], {
                        type: "image/png",
                    });
                    const file = new File([blob], "image.png", {
                        type: "image/png",
                    });
                    formData.append("primaryImage", file);

                    let res = await fetch(
                        "/admin/products/add-product",
                        {
                            method: "POST",
                            body: formData
                        }
                    );
                    let data = await res.json();
                    if (data.success) {
                        Swal.fire(
                            "Created!",
                            "New product has been created successfully.",
                            "success"
                        ).then(() =>
                            location.assign("/admin/products")
                        );
                    } else {
                        throw new Error(data.message);
                    }
                } catch (e) {
                    Swal.fire("Error!", e.message, "error");
                }
            }
        });
    },
});


const searchProduct = async () => {
    let search = document.getElementById("searchInput").value;
    let queryLink = document.getElementById('querry');
    queryLink.href = "/products/?search=" + encodeURIComponent(search);
}
