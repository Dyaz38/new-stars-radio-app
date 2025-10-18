// Cover Art Admin Interface JavaScript

const API_BASE = 'http://localhost:3001/api';
let currentPage = 1;
let currentSearch = '';
let deleteTargetId = null;

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const statusMessage = document.getElementById('statusMessage');
const imageFile = document.getElementById('imageFile');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loadAllBtn = document.getElementById('loadAllBtn');
const results = document.getElementById('results');
const noResults = document.getElementById('noResults');
const loadingSpinner = document.getElementById('loadingSpinner');
const pagination = document.getElementById('pagination');
const deleteModal = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');

// Utility Functions
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `p-4 rounded-lg ${
        type === 'success' ? 'bg-green-600/20 border border-green-500/30 text-green-300' :
        type === 'error' ? 'bg-red-600/20 border border-red-500/30 text-red-300' :
        'bg-blue-600/20 border border-blue-500/30 text-blue-300'
    }`;
    uploadStatus.classList.remove('hidden');
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            uploadStatus.classList.add('hidden');
        }, 5000);
    }
}

function showLoading(show = true) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
        results.classList.add('hidden');
        noResults.classList.add('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
        results.classList.remove('hidden');
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Image Preview
imageFile.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.classList.add('hidden');
    }
});

// Upload Form
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('artist', document.getElementById('artist').value.trim());
    formData.append('title', document.getElementById('title').value.trim());
    formData.append('album', document.getElementById('album').value.trim());
    formData.append('image', imageFile.files[0]);
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    
    try {
        const response = await fetch(`${API_BASE}/cover-art/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus('Cover art uploaded successfully!', 'success');
            uploadForm.reset();
            imagePreview.classList.add('hidden');
            
            // Refresh the results if we're showing all
            if (!currentSearch) {
                loadAllCoverArt(1);
            }
        } else {
            showStatus(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Upload failed: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Cover Art';
    }
});

// Search Functions
async function searchCoverArt(query) {
    showLoading(true);
    currentSearch = query;
    currentPage = 1;
    
    try {
        const response = await fetch(`${API_BASE}/cover-art/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (response.ok) {
            displayResults(data.results);
            pagination.innerHTML = ''; // Clear pagination for search results
        } else {
            showStatus(data.error || 'Search failed', 'error');
            displayResults([]);
        }
    } catch (error) {
        console.error('Search error:', error);
        showStatus('Search failed: ' + error.message, 'error');
        displayResults([]);
    } finally {
        showLoading(false);
    }
}

async function loadAllCoverArt(page = 1) {
    showLoading(true);
    currentSearch = '';
    currentPage = page;
    
    try {
        const response = await fetch(`${API_BASE}/cover-art/all?page=${page}&limit=20`);
        const data = await response.json();
        
        if (response.ok) {
            displayResults(data.coverArt);
            displayPagination(data.pagination);
        } else {
            showStatus(data.error || 'Failed to load cover art', 'error');
            displayResults([]);
        }
    } catch (error) {
        console.error('Load error:', error);
        showStatus('Failed to load cover art: ' + error.message, 'error');
        displayResults([]);
    } finally {
        showLoading(false);
    }
}

function displayResults(coverArtList) {
    results.innerHTML = '';
    
    if (coverArtList.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    coverArtList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all';
        
        card.innerHTML = `
            <div class="aspect-square mb-3 relative group">
                <img src="${API_BASE.replace('/api', '')}${item.thumbnailUrl}" 
                     alt="${item.artist} - ${item.title}"
                     class="w-full h-full object-cover rounded-lg">
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all rounded-lg flex items-center justify-center space-x-2">
                    <button onclick="viewFullImage('${API_BASE.replace('/api', '')}${item.imageUrl}', '${item.artist}', '${item.title}')" 
                            class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    <button onclick="deleteCoverArt('${item.id}')" 
                            class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="space-y-1">
                <h3 class="font-semibold text-sm truncate">${item.title}</h3>
                <p class="text-gray-300 text-xs truncate">${item.artist}</p>
                ${item.album ? `<p class="text-gray-400 text-xs truncate">${item.album}</p>` : ''}
                <p class="text-gray-500 text-xs">${item.width}×${item.height}</p>
                <p class="text-gray-500 text-xs">${formatDate(item.createdAt)}</p>
            </div>
        `;
        
        results.appendChild(card);
    });
}

function displayPagination(paginationData) {
    pagination.innerHTML = '';
    
    if (paginationData.totalPages <= 1) return;
    
    const { page, totalPages } = paginationData;
    
    // Previous button
    if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-all';
        prevBtn.onclick = () => loadAllCoverArt(page - 1);
        pagination.appendChild(prevBtn);
    }
    
    // Page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `px-3 py-1 text-sm rounded transition-all ${
            i === page 
                ? 'bg-primary text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`;
        pageBtn.onclick = () => loadAllCoverArt(i);
        pagination.appendChild(pageBtn);
    }
    
    // Next button
    if (page < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-all';
        nextBtn.onclick = () => loadAllCoverArt(page + 1);
        pagination.appendChild(nextBtn);
    }
}

// View full image
function viewFullImage(imageUrl, artist, title) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    modal.innerHTML = `
        <div class="max-w-4xl max-h-full">
            <div class="bg-gray-900 border border-white/10 rounded-2xl p-4">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-bold">${title}</h3>
                        <p class="text-gray-300">${artist}</p>
                    </div>
                    <button onclick="document.body.removeChild(this.closest('.fixed'))" 
                            class="text-gray-400 hover:text-white text-2xl">×</button>
                </div>
                <img src="${imageUrl}" alt="${artist} - ${title}" 
                     class="w-full h-auto max-h-[70vh] object-contain rounded-lg">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Delete Functions
function deleteCoverArt(id) {
    deleteTargetId = id;
    deleteModal.classList.remove('hidden');
}

confirmDelete.addEventListener('click', async function() {
    if (!deleteTargetId) return;
    
    try {
        const response = await fetch(`${API_BASE}/cover-art/${deleteTargetId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus('Cover art deleted successfully!', 'success');
            
            // Refresh current view
            if (currentSearch) {
                searchCoverArt(currentSearch);
            } else {
                loadAllCoverArt(currentPage);
            }
        } else {
            showStatus(data.error || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showStatus('Delete failed: ' + error.message, 'error');
    }
    
    deleteModal.classList.add('hidden');
    deleteTargetId = null;
});

cancelDelete.addEventListener('click', function() {
    deleteModal.classList.add('hidden');
    deleteTargetId = null;
});

// Event Listeners
searchBtn.addEventListener('click', function() {
    const query = searchInput.value.trim();
    if (query) {
        searchCoverArt(query);
    }
});

searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            searchCoverArt(query);
        }
    }
});

loadAllBtn.addEventListener('click', function() {
    searchInput.value = '';
    loadAllCoverArt(1);
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadAllCoverArt(1);
});

