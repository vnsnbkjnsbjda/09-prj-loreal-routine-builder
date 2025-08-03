/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const keywordFilter = document.getElementById("keywordFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectionList = document.getElementById('selectedProductsList');



/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* --- Selected Products Logic --- */
let selectedProductIds = JSON.parse(localStorage.getItem('selectedProductIds')) || [];

// Helper to save selection to localStorage
function saveSelectedProducts() {
  localStorage.setItem('selectedProductIds', JSON.stringify(selectedProductIds));
}

// Helper to render selected products list
async function renderSelectedProductsList() {
  const products = await loadProducts();
  selectionList.innerHTML = selectedProductIds
    .map(id => {
      const product = products.find(p => p.id === id);
      if (!product) return '';
      return `
        <div class="selected-product-tab" data-id="${product.id}" title="Click to remove">
          <img src="${product.image}" alt="${product.name}" width="40" height="40">
          <span>${product.name}</span>
          <button class="remove-selected-btn" data-id="${product.id}" title="Remove">&times;</button>
        </div>
      `;
    })
    .join('');
}

// Select/deselect product card
function toggleProductSelection(productId) {
  productId = Number(productId);
  const idx = selectedProductIds.indexOf(productId);
  if (idx === -1) {
    selectedProductIds.push(productId);
  } else {
    selectedProductIds.splice(idx, 1);
  }
  saveSelectedProducts();
  renderSelectedProductsList();
  updateProductCardSelection();
}

// Update product card UI for selection
function updateProductCardSelection() {
  selectedProductIds.forEach(id => {
    const card = document.getElementById(`productID-${id}`);
    if (card) card.classList.add('selected');
  });
  // Remove selection from unselected cards
  document.querySelectorAll('.product-card').forEach(card => {
    const id = Number(card.id.replace('productID-', ''));
    if (!selectedProductIds.includes(id)) {
      card.classList.remove('selected');
    }
  });
}

// Attach click handlers to product cards
function attachProductCardHandlers() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.onclick = () => {
      const id = card.id.replace('productID-', '');
      toggleProductSelection(id);
    };
  });
}

// Attach click handlers to selected product tabs
selectionList.onclick = function(e) {
  const btn = e.target.closest('.remove-selected-btn');
  const tab = e.target.closest('.selected-product-tab');
  if (btn) {
    const id = btn.getAttribute('data-id');
    toggleProductSelection(id);
  } else if (tab) {
    const id = tab.getAttribute('data-id');
    toggleProductSelection(id);
  }
};

// Create HTML for displaying product cards
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div id="productID-${product.id}" class="product-card" tabindex="0" data-description="${product.description.replace(/"/g, '&quot;')}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");
  attachProductCardHandlers();
  updateProductCardSelection();
  attachProductCardCaptionHandlers();
}

const captionBar = document.getElementById('productCaption');

// Show/hide product description caption
function attachProductCardCaptionHandlers() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      const desc = card.getAttribute('data-description');
      captionBar.textContent = desc;
      captionBar.classList.add('active');
    });
    card.addEventListener('mouseleave', function() {
      captionBar.classList.remove('active');
      captionBar.textContent = '';
    });
    card.addEventListener('focus', function() {
      // For keyboard accessibility
      const desc = card.getAttribute('data-description');
      captionBar.textContent = desc;
      captionBar.classList.add('active');
    });
    card.addEventListener('blur', function() {
      captionBar.classList.remove('active');
      captionBar.textContent = '';
    });
  });
}

// Helper to filter products by category and keyword
function filterProducts(products, category, keyword) {
  let filtered = products;
  // Show all products if "all" is selected
  if (category && category !== "all") {
    filtered = filtered.filter(product => product.category === category);
  }
  if (keyword && keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    filtered = filtered.filter(product =>
      product.name.toLowerCase().includes(kw) ||
      product.brand.toLowerCase().includes(kw)
    );
  }
  return filtered;
}

// Unified filter handler
async function handleFilterChange() {
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;
  const keyword = keywordFilter.value;

  // Only show products if category is chosen OR something is typed
  // "all" counts as chosen
  if ((!selectedCategory || selectedCategory === "") && (!keyword || !keyword.trim())) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category or type to view products
      </div>
    `;
    return;
  }

  const filteredProducts = filterProducts(products, selectedCategory, keyword);
  displayProducts(filteredProducts);
}

// Listen for changes in category and keyword input
categoryFilter.addEventListener("change", handleFilterChange);
keywordFilter.addEventListener("input", handleFilterChange);

// On page load, render selected products and restore selection
window.addEventListener('DOMContentLoaded', async () => {
  renderSelectedProductsList();
  handleFilterChange();
});

const workerUrl = 'https://lorealchatbot.mxk2179.workers.dev/';

let messages = [
  {
    role: 'system', content: `You are a helpful, supportive, kind, expert at Loreal.
    You are familiar with dermatology, cosmetology, and brands collaborating with Loreal.
    You will personalize products and routines by prioritizing compatibility with the
    user's health and product preferences. Be sure to ask optional questions to better
    understand what the user may want. 
    
    When a skincare routine is prompted, don't ask questions until after you've given
    the recommended routine. 

    When reminded the users about the products they've forgotten, just give the name unless
    prompted to provide more.

    When you are looking up on the internet, let the user know before giving your response.
    Be sure to cite your sources!
    
    Politely refuse to answer responses not about Loreal, its brand partners, or beauty routines
    and other beauty topics.
    
    When a conversation is over, conclude with a short empowering message Loreal would support.`
  }
]

welcomeQuote = `Hello! How may I help you?`

// Add introduction message
const startMsg = document.createElement('div');
startMsg.classList.add('msg', 'assistantBubble');
startMsg.innerHTML = welcomeQuote;
chatWindow.appendChild(startMsg);

messages.push({role: 'assistant', content: welcomeQuote});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  messages.push({role: 'user', content: userInput.value})

  let newMsg;

  // Add user bubble
  newMsg = document.createElement('div');
  newMsg.classList.add('msg', 'userBubble');
  newMsg.innerHTML = userInput.value;
  chatWindow.appendChild(newMsg);

  // temp thinking msg - delay to seem more humanlike
  setTimeout(function(){
    let temp;
    temp = document.createElement('div');
    temp.classList.add('msg', 'assistantBubble');
    temp.id = 'tempBubble';
    temp.innerHTML = 'Thinking . . .';
    chatWindow.appendChild(temp);
  }, 500);


  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages,
      max_tokens: 200,
    }),
    tools: [ { type: "web_search_preview" } ],
  })

  if (!response.ok){
    throw new Error(`Fetch failed --- STATUS: ${response.status}`);
  }

  const data = await response.json(); //data.choices[0].message.content;

  messages.push({role: 'assistant', content: data.choices[0].message.content});

  // Remove thinking bubble
  document.getElementById('tempBubble').remove();

  // Add assistant bubble
  newMsg = document.createElement('div');
  newMsg.classList.add('msg', 'assistantBubble');
  newMsg.innerHTML = data.choices[0].message.content;
  chatWindow.appendChild(newMsg);

  // Clear user input
  userInput.value = '';

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

});

// Returns a JSON string of selected products
async function getSelectedProductsData() {
  const products = await loadProducts();
  const selected = selectedProductIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean);
  return JSON.stringify(selected);
}

document.getElementById('generateRoutine').addEventListener('click', async () => {
  const userMsg = "Please help me build a routine with the products I sent you!"
  const selectedProductsJson = await getSelectedProductsData();
  console.log(selectedProductsJson);
  messages.push({role: 'user', content: `${userMsg} Here it is in JSON form: ${selectedProductsJson}`})

  let newMsg;

  // Add user bubble
  newMsg = document.createElement('div');
  newMsg.classList.add('msg', 'userBubble');
  newMsg.innerHTML = userMsg;
  chatWindow.appendChild(newMsg);

  // temp thinking msg - delay to seem more humanlike
  setTimeout(function(){
    let temp;
    temp = document.createElement('div');
    temp.classList.add('msg', 'assistantBubble');
    temp.id = 'tempBubble';
    temp.innerHTML = 'Thinking . . .';
    chatWindow.appendChild(temp);
  }, 500);

  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages,
      max_tokens: 200,
    }),
  })

  if (!response.ok){
    throw new Error(`Fetch failed --- STATUS: ${response.status}`);
  }

  const data = await response.json(); //data.choices[0].message.content;

  messages.push({role: 'assistant', content: data.choices[0].message.content});

  // Remove thinking bubble
  document.getElementById('tempBubble').remove();

  // Add assistant bubble
  newMsg = document.createElement('div');
  newMsg.classList.add('msg', 'assistantBubble');
  newMsg.innerHTML = data.choices[0].message.content;
  chatWindow.appendChild(newMsg);

  // Clear user input
  userInput.value = '';

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
})

