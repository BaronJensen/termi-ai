// Cursovable GitHub Pages - Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Smooth Scrolling for Navigation Links
    const navAnchors = document.querySelectorAll('a[href^="#"]');
    navAnchors.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            }
        });
    });
    
    // Navbar Background on Scroll
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove background on scroll
        if (scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide/show navbar on scroll (optional)
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Intersection Observer for Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .download-card, .doc-card, .step');
    animateElements.forEach(el => {
        observer.observe(el);
    });
    
    // Parallax Effect for Hero Section
    const hero = document.querySelector('.hero');
    const appPreview = document.querySelector('.app-preview');
    
    if (hero && appPreview) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            appPreview.style.transform = `translateY(${rate}px)`;
        });
    }
    
    // Download Button Click Tracking
    const downloadButtons = document.querySelectorAll('.btn-download');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Add loading state
            this.classList.add('loading');
            
            // Simulate download delay (remove in production)
            setTimeout(() => {
                this.classList.remove('loading');
            }, 2000);
            
            // Track download click (analytics)
            trackEvent('download_clicked', {
                platform: this.closest('.download-card').querySelector('h3').textContent.toLowerCase(),
                button_text: this.textContent.trim()
            });
        });
    });
    
    // GitHub Star Counter (if available)
    updateGitHubStats();
    
    // Theme Toggle (Dark/Light Mode)
    initializeThemeToggle();
    
    // Search Functionality (if needed)
    initializeSearch();
    
    // Performance Monitoring
    initializePerformanceMonitoring();
});

// GitHub Stats Update
async function updateGitHubStats() {
    try {
        // This would typically fetch from GitHub API
        // For now, we'll use placeholder data
        const stats = {
            stars: '100+',
            forks: '25+',
            contributors: '15+'
        };
        
        // Update stats in the UI if elements exist
        const starCount = document.querySelector('.github-stars');
        if (starCount) {
            starCount.textContent = stats.stars;
        }
    } catch (error) {
        console.log('Could not fetch GitHub stats:', error);
    }
}

// Theme Toggle Functionality
function initializeThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update toggle icon
        updateThemeIcon(newTheme);
    });
}

// Update Theme Icon
function updateThemeIcon(theme) {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Search Functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');
    
    if (!searchInput || !searchResults) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

// Perform Search
function performSearch(query) {
    // This would typically search through documentation or issues
    // For now, we'll show a placeholder
    const searchResults = document.querySelector('.search-results');
    if (!searchResults) return;
    
    // Simulate search results
    const results = [
        { title: 'Getting Started Guide', url: '#', type: 'Documentation' },
        { title: 'Installation Instructions', url: '#', type: 'Guide' },
        { title: 'Troubleshooting Common Issues', url: '#', type: 'Help' }
    ].filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase())
    );
    
    displaySearchResults(results);
}

// Display Search Results
function displaySearchResults(results) {
    const searchResults = document.querySelector('.search-results');
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No results found</div>';
    } else {
        searchResults.innerHTML = results.map(result => `
            <a href="${result.url}" class="search-result">
                <div class="result-title">${result.title}</div>
                <div class="result-type">${result.type}</div>
            </a>
        `).join('');
    }
    
    searchResults.style.display = 'block';
}

// Performance Monitoring
function initializePerformanceMonitoring() {
    // Monitor page load performance
    if ('performance' in window) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    trackEvent('page_performance', {
                        load_time: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                        dom_content_loaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
                        first_paint: getFirstPaintTime()
                    });
                }
            }, 0);
        });
    }
    
    // Monitor scroll performance
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackEvent('scroll_performance', {
                scroll_depth: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
            });
        }, 100);
    });
}

// Get First Paint Time
function getFirstPaintTime() {
    if ('performance' in window) {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? Math.round(firstPaint.startTime) : null;
    }
    return null;
}

// Event Tracking (Analytics)
function trackEvent(eventName, properties = {}) {
    // This would typically send to Google Analytics, Mixpanel, etc.
    // For now, we'll just log to console
    console.log('Event tracked:', eventName, properties);
    
    // Example: Send to Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
    }
    
    // Example: Send to Mixpanel
    if (typeof mixpanel !== 'undefined') {
        mixpanel.track(eventName, properties);
    }
}

// Lazy Loading for Images
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

// Keyboard Navigation
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Escape key closes modals/search
        if (e.key === 'Escape') {
            const searchResults = document.querySelector('.search-results');
            if (searchResults && searchResults.style.display === 'block') {
                searchResults.style.display = 'none';
            }
        }
        
        // Ctrl/Cmd + K opens search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
}

// Accessibility Improvements
function initializeAccessibility() {
    // Add skip to content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content landmark
    const mainContent = document.querySelector('main') || document.querySelector('.hero');
    if (mainContent) {
        mainContent.id = 'main-content';
        mainContent.setAttribute('role', 'main');
    }
    
    // Add ARIA labels to interactive elements
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(button => {
        if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
            button.setAttribute('aria-label', 'Button');
        }
    });
}

// Error Handling
function initializeErrorHandling() {
    window.addEventListener('error', function(e) {
        console.error('JavaScript error:', e.error);
        trackEvent('javascript_error', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno
        });
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        trackEvent('unhandled_promise_rejection', {
            reason: e.reason
        });
    });
}

// Initialize all features
document.addEventListener('DOMContentLoaded', function() {
    initializeLazyLoading();
    initializeKeyboardNavigation();
    initializeAccessibility();
    initializeErrorHandling();
});

// Export functions for potential external use
window.CursovableSite = {
    trackEvent,
    updateGitHubStats,
    performSearch
};
