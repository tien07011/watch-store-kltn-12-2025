(function(){
  function formatVND(value){
    const num = Number(value) || 0;
    return num.toLocaleString('vi-VN') + ' vnđ';
  }
  function renderCard(p){
    const img = (p && p.primary_image && p.primary_image.name) ? `/productImages/${p.primary_image.name}` : '/images/placeholder.png';
    const price = formatVND(p?.selling_price || 0);
    return `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3">
        <div class="card product-card h-100 border-0 shadow-sm">
          <div class="ratio ratio-4x3">
            <img class="card-img-top" src="${img}" alt="${p.product_name || ''}">
          </div>
          <div class="card-body d-flex flex-column">
            <h5 class="card-title text-truncate">${p.product_name || ''}</h5>
            <p class="d-flex justify-content-between align-items-center mb-2">
              <span class="text-secondary small text-capitalize">${p.brand_name || ''}</span>
              <span class="price price-primary"><span class="price-value">${price}</span></span>
            </p>
            <div class="mt-auto d-flex gap-2">
              <a href="/view_product/${p._id}" class="btn btn-primary w-50">Xem chi tiết</a>
              <button type="button" onclick="addToCart('${p._id}')" class="btn btn-outline-dark w-50">Thêm giỏ</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  async function loadHomeRecommendations(){
    const grid = document.getElementById('recHomeGrid');
    const empty = document.getElementById('recHomeEmpty');
    if (!grid) return; // not on home or no section
    if (!window.__USER__) return; // only fetch for logged-in users
    try{
      const res = await fetch('/recommendations?limit=8');
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length){
        if (empty) empty.style.display = 'block';
        return;
      }
      grid.innerHTML = items.map(renderCard).join('');
    }catch(e){
      // silent fail
    }
  }
  document.addEventListener('DOMContentLoaded', loadHomeRecommendations);
})();
