// Initialize Lucide icons when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Chiliz MCP Landing Page...');

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Mobile menu functionality
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.remove('active');
            });
        });
    }

    // Add animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all feature cards and token items
    document.querySelectorAll('.feature-card, .token-item, .dex-card').forEach(el => {
        observer.observe(el);
    });
});

// Smooth scrolling to sections - MAIN FUNCTION FOR GET STARTED
function scrollToSection(sectionId) {
    console.log('Scrolling to section:', sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    } else {
        console.error('Section not found:', sectionId);
    }
}

// Copy code to clipboard
function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    if (!codeBlock) {
        console.error('Code block not found');
        return;
    }

    const code = codeBlock.querySelector('code');
    if (!code) {
        console.error('Code element not found');
        return;
    }

    const textToCopy = code.textContent || code.innerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
        // Store original content
        const originalHTML = button.innerHTML;

        // Change to success state
        button.innerHTML = '<i data-lucide="check" style="width: 16px; height: 16px;"></i> Copied!';
        button.classList.add('copied');

        // Re-initialize Lucide for the new icon
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Reset after 2 seconds
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copied');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        button.innerHTML = '<i data-lucide="x" style="width: 16px; height: 16px;"></i> Failed';
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    });
}

// Tab switching for documentation
function showTab(tabName) {
    console.log('Switching to tab:', tabName);

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Find and activate the clicked button
    event.target.classList.add('active');
}

// Platform switching for installation instructions
function showPlatform(platform) {
    console.log('Switching to platform:', platform);

    // Hide all platform content
    document.querySelectorAll('.platform-content').forEach(el => {
        el.style.display = 'none';
    });

    // Show selected platform
    const selectedContent = document.getElementById(platform + '-content');
    if (selectedContent) {
        selectedContent.style.display = 'block';
    }

    // Update tab states
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Activate clicked tab
    if (event && event.target) {
        const clickedTab = event.target.closest('.platform-tab');
        if (clickedTab) {
            clickedTab.classList.add('active');
        }
    }
}

// Alternative function for platform switching (for inline buttons)
function switchPlatform(platform) {
    console.log('Switching platform to:', platform);

    document.querySelectorAll('.platform-content').forEach(el => {
        el.style.display = 'none';
    });

    const platformPath = document.getElementById(platform + '-path');
    if (platformPath) {
        platformPath.style.display = 'block';
    }

    document.querySelectorAll('.platform-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Tab switching for installation methods
function switchInstallTab(tabName) {
    console.log('Switching install tab to:', tabName);

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }

    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Copy code block function (alternative implementation)
function copyCodeBlock(button) {
    copyCode(button);
}

// Test function to verify script is loaded
console.log('Chiliz MCP script.js loaded successfully');