// ===== LOGIN CHECK =====
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

const currentUser = localStorage.getItem('currentUser');

if (currentUser) {
    const welcome = document.getElementById('welcomeUser');
    if (welcome) welcome.textContent = `Welcome, ${currentUser}!`;
}

// ===== STATE =====
let cart = [];
let quantities = {};
let currentOrderNumber = '';

// ===== PRODUCTS =====
const products = {
    cookies: [
        { id: 'cookies-1', name: 'Lays Chips ~50g', price: 40 },
        { id: 'cookies-2', name: 'Doritos ~50g', price: 40 },
        { id: 'cookies-3', name: 'Pringles ~50g', price: 40 }
    ],
    snacks: [
        { id: 'snacks-1', name: 'Airwaves', price: 50 },
        { id: 'snacks-2', name: 'Hersheys', price: 50 }
    ],
    drinks: [
        { id: 'drinks-1', name: 'Coke ~350ml', price: 50 },
        { id: 'drinks-2', name: 'Sprite ~350ml', price: 50 },
        { id: 'drinks-3', name: 'Orange Juice ~200ml', price: 50 },
        { id: 'drinks-4', name: 'Pepsi ~350ml', price: 50 }
    ],
    ramen: [
        { id: 'ramen-1', name: 'Cup Noodles', price: 60 },
        { id: 'ramen-2', name: 'Shin Ramen', price: 70 }
    ],
    donuts: [
        { id: 'donuts-1', name: 'Glazed Donut', price: 50 },
        { id: 'donuts-2', name: 'Chocolate Donut', price: 50 }
    ],
    giftcards: [
        { id: 'giftcard-1', name: 'Minecraft Gift Card', price: 800 },
        { id: 'giftcard-2', name: 'Google Play Gift Card', price: 500 }
    ]
};

// init quantities
Object.values(products).flat().forEach(p => {
    quantities[p.id] = 1;
});

// ===== UTIL =====
function el(id) {
    return document.getElementById(id);
}

function generateOrderNumber() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===== RENDER PRODUCTS =====
function renderProducts() {
    Object.keys(products).forEach(cat => {
        const grid = el(`${cat}-grid`);
        if (!grid) return;

        grid.innerHTML = products[cat].map(p => `
            <div class="product-card">
                <div class="product-image">📦</div>

                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">$${p.price.toFixed(2)}</div>

                    <div class="quantity-control">
                        <button class="qty-btn" data-id="${p.id}" data-action="dec">-</button>
                        <div id="qty-${p.id}">${quantities[p.id]}</div>
                        <button class="qty-btn" data-id="${p.id}" data-action="inc">+</button>
                    </div>

                    <button class="add-to-cart-btn" data-id="${p.id}">
                        Add to Cart
                    </button>
                </div>
            </div>
        `).join('');
    });
}

// ===== QUANTITY =====
function changeQty(id, type) {
    if (type === 'inc') quantities[id]++;
    else quantities[id] = Math.max(1, quantities[id] - 1);

    const elQty = document.getElementById('qty-' + id);
    if (elQty) elQty.textContent = quantities[id];
}

// ===== CART =====
function addToCart(id) {
    const product = Object.values(products).flat().find(p => p.id === id);
    if (!product) return;

    cart.push({
        id,
        name: product.name,
        price: product.price,
        quantity: quantities[id]
    });

    quantities[id] = 1;
    const elQty = document.getElementById('qty-' + id);
    if (elQty) elQty.textContent = 1;

    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function updateCart() {
    const cartItems = el('cartItems');
    const cartCount = el('cartCount');
    const totalAmount = el('totalAmount');

    if (!cartItems || !cartCount || !totalAmount) return;

    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-cart-message">Your cart is empty</div>`;
        totalAmount.textContent = "$0.00";
        cartCount.textContent = "0";
        return;
    }

    cartItems.innerHTML = cart.map((item, i) => {
        total += item.price * item.quantity;
        count += item.quantity;

        return `
            <div class="cart-item">
                <div>
                    <div>${item.name}</div>
                    <div>$${item.price} x ${item.quantity}</div>
                </div>
                <button class="remove-btn" data-index="${i}">Remove</button>
            </div>
        `;
    }).join('');

    cartCount.textContent = count;
    totalAmount.textContent = "$" + total.toFixed(2);
}

// ===== TOGGLES =====
function toggleCart() {
    el('cartOverlay')?.classList.toggle('active');
    el('cartSidebar')?.classList.toggle('active');
}

function closeCheckout() {
    el('formOverlay')?.classList.remove('active');
    el('checkoutForm')?.classList.remove('active');
}

// ===== FIREBASE SAVE =====
async function saveOrder(orderNumber, items, total) {
    const user = localStorage.getItem('currentUser');

    try {
        await window.addDoc(window.collection(window.db, 'orders'), {
            username: user,
            orderNumber,
            items,
            total,
            date: new Date().toISOString(),
            timestamp: Date.now()
        });
    } catch (e) {
        console.error(e);
    }
}

// ===== HISTORY =====
async function showHistory() {
    const user = localStorage.getItem('currentUser');
    const box = el('historyContent');

    if (!box) return;

    el('historyOverlay')?.classList.add('active');
    el('historyModal').style.display = 'block';

    box.innerHTML = "Loading...";

    try {
        const q = window.query(
            window.collection(window.db, 'orders'),
            window.where('username', '==', user),
            window.orderBy('timestamp', 'desc')
        );

        const snap = await window.getDocs(q);

        if (snap.empty) {
            box.innerHTML = "<p>No orders yet</p>";
            return;
        }

        let html = "";

        snap.forEach(doc => {
            const o = doc.data();

            html += `
                <div class="history-order">
                    <h3>Order #${o.orderNumber}</h3>
                    <p>Total: $${o.total}</p>
                </div>
            `;
        });

        box.innerHTML = html;

    } catch (e) {
        console.error(e);
        box.innerHTML = "<p>Error loading history</p>";
    }
}

// ===== EVENTS =====
window.addEventListener('DOMContentLoaded', () => {

    renderProducts();

    // cart
    el('cartButton')?.addEventListener('click', toggleCart);
    el('closeCartBtn')?.addEventListener('click', toggleCart);
    el('cartOverlay')?.addEventListener('click', toggleCart);

    // history
    el('viewHistoryBtn')?.addEventListener('click', showHistory);

    el('closeHistoryBtn')?.addEventListener('click', () => {
        el('historyOverlay').classList.remove('active');
        el('historyModal').style.display = 'none';
    });

    el('historyOverlay')?.addEventListener('click', () => {
        el('historyOverlay').classList.remove('active');
        el('historyModal').style.display = 'none';
    });

    // qty + add
    document.addEventListener('click', (e) => {

        if (e.target.classList.contains('qty-btn')) {
            changeQty(
                e.target.dataset.id,
                e.target.dataset.action
            );
        }

        if (e.target.classList.contains('add-to-cart-btn')) {
            addToCart(e.target.dataset.id);
        }

        if (e.target.classList.contains('remove-btn')) {
            removeFromCart(Number(e.target.dataset.index));
        }
    });

    // checkout
    el('checkoutBtn')?.addEventListener('click', () => {

        if (cart.length === 0) return alert("Cart empty");

        currentOrderNumber = generateOrderNumber();
        el('orderNumber').value = currentOrderNumber;

        toggleCart();

        el('formOverlay').classList.add('active');
        el('checkoutForm').classList.add('active');
    });

    el('cancelBtn')?.addEventListener('click', closeCheckout);
    el('formOverlay')?.addEventListener('click', closeCheckout);

    // submit
    el('orderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        let total = 0;
        let text = "";

        cart.forEach((item, i) => {
            const sub = item.price * item.quantity;
            total += sub;

            text += `${i+1}. ${item.name} x${item.quantity}\n`;
        });

        el('orderItems').value = text;
        el('totalAmountHidden').value = total;

        await saveOrder(currentOrderNumber, cart, total);

        await fetch(e.target.action, {
            method: "POST",
            body: new FormData(e.target),
            mode: "no-cors"
        });

        cart = [];
        updateCart();

        closeCheckout();

        el('thankYouOverlay').classList.add('active');
        el('displayOrderNumber').textContent = currentOrderNumber;

        e.target.reset();
    });

    // ===== FIX: Thank You close button =====
    el('thankYouBtn')?.addEventListener('click', () => {
        el('thankYouOverlay').classList.remove('active');
    });

    // logout
    el('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

});
