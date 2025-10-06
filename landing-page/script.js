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

// Initialize Lucide icons after any dynamic content changes
function reinitLucide() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ==================== SANDBOX FUNCTIONALITY ====================

const TOOL_CONFIGS = {
    // Price Tools
    get_token_price: {
        category: 'Prices',
        description: 'Get current price and market data for any fan token',
        params: [
            { name: 'symbol', type: 'text', placeholder: 'PSG', required: true, description: 'Token symbol (e.g., PSG, BAR, CHZ, MENGO)' }
        ]
    },
    get_multiple_prices: {
        category: 'Prices',
        description: 'Compare prices of multiple fan tokens at once',
        params: [
            { name: 'symbols', type: 'text', placeholder: 'PSG,BAR,MENGO', required: true, description: 'Comma-separated token symbols', isArray: true }
        ]
    },
    get_market_overview: {
        category: 'Prices',
        description: 'Get market overview with top fan tokens by market cap',
        params: [
            { name: 'limit', type: 'number', placeholder: '10', required: false, description: 'Number of tokens to show (default: 10)' }
        ]
    },
    get_price_history: {
        category: 'Prices',
        description: 'Get historical price data for a token (7 days)',
        params: [
            { name: 'symbol', type: 'text', placeholder: 'PSG', required: true, description: 'Token symbol' }
        ]
    },

    // Wallet Tools
    get_wallet_balance: {
        category: 'Wallet',
        description: 'Get CHZ balance for any wallet address on Chiliz Chain',
        params: [
            { name: 'address', type: 'text', placeholder: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', required: true, description: 'Ethereum wallet address' }
        ]
    },
    get_transaction: {
        category: 'Wallet',
        description: 'Get details of a specific transaction by hash',
        params: [
            { name: 'txHash', type: 'text', placeholder: '0x...', required: true, description: 'Transaction hash' }
        ]
    },

    // Blockchain Tools
    get_blockchain_info: {
        category: 'Blockchain',
        description: 'Get current Chiliz blockchain information and network stats',
        params: []
    },
    get_block: {
        category: 'Blockchain',
        description: 'Get detailed information about a specific block',
        params: [
            { name: 'blockNumber', type: 'number', placeholder: '27672926', required: false, description: 'Block number (leave empty for latest)' }
        ]
    },

    // Analytics Tools
    detect_whale_trades: {
        category: 'Analytics',
        description: 'Detect large transactions (whale trades) in recent blocks',
        params: [
            { name: 'minValueUSD', type: 'number', placeholder: '100000', required: false, description: 'Minimum value in USD (default: 100000)' },
            { name: 'blockRange', type: 'number', placeholder: '100', required: false, description: 'Number of blocks to scan (default: 100)' }
        ]
    },
    get_fan_tokens_list: {
        category: 'Analytics',
        description: 'Get list of all supported fan tokens with metadata',
        params: []
    }
};

function updateToolParams() {
    const toolSelect = document.getElementById('toolSelect');
    const toolDescription = document.getElementById('toolDescription');
    const toolParams = document.getElementById('toolParams');
    const executeBtn = document.getElementById('executeBtn');

    const selectedTool = toolSelect.value;

    if (!selectedTool) {
        toolDescription.classList.remove('active');
        toolParams.innerHTML = '';
        executeBtn.disabled = true;
        return;
    }

    const config = TOOL_CONFIGS[selectedTool];

    // Show description
    toolDescription.textContent = config.description;
    toolDescription.classList.add('active');

    // Build params form
    if (config.params.length === 0) {
        toolParams.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">No parameters required</p>';
    } else {
        toolParams.innerHTML = config.params.map(param => `
            <div class="param-group">
                <label>${param.name}${param.required ? ' *' : ''}</label>
                <input
                    type="${param.type}"
                    id="param_${param.name}"
                    placeholder="${param.placeholder}"
                    ${param.required ? 'required' : ''}
                />
                <small>${param.description}</small>
            </div>
        `).join('');
    }

    executeBtn.disabled = false;
    reinitLucide();
}

async function executeTool() {
    const toolSelect = document.getElementById('toolSelect');
    const executeBtn = document.getElementById('executeBtn');
    const output = document.getElementById('output');
    const copyBtn = document.getElementById('copyOutputBtn');

    const selectedTool = toolSelect.value;
    if (!selectedTool) return;

    const config = TOOL_CONFIGS[selectedTool];

    // Gather parameters
    const params = {};
    for (const param of config.params) {
        const input = document.getElementById(`param_${param.name}`);
        if (input) {
            const value = input.value.trim();
            if (param.required && !value) {
                alert(`${param.name} is required`);
                return;
            }
            if (value) {
                if (param.isArray) {
                    // Convert comma-separated string to array
                    params[param.name] = value.split(',').map(s => s.trim()).filter(Boolean);
                } else if (param.type === 'number') {
                    params[param.name] = parseFloat(value);
                } else {
                    params[param.name] = value;
                }
            }
        }
    }

    // Show loading state
    executeBtn.classList.add('loading');
    executeBtn.innerHTML = '<div class="spinner"></div> Executing...';
    output.innerHTML = '<div class="output-loading"><div class="spinner"></div></div>';
    copyBtn.style.display = 'none';

    try {
        const response = await fetch('/api/sandbox', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tool: selectedTool,
                params: params
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        // Display success output
        output.innerHTML = `
            <div class="output-json">
                <pre><code class="language-json">${JSON.stringify(data, null, 2)}</code></pre>
            </div>
        `;

        // Show copy button
        copyBtn.style.display = 'flex';
        window.sandboxOutput = data;

        // Update rate limit info
        if (data.metadata && data.metadata.rateLimit) {
            const rateLimitInfo = document.getElementById('rateLimitInfo');
            rateLimitInfo.innerHTML = `
                <i data-lucide="info" style="width: 14px; height: 14px;"></i>
                <span>${data.metadata.rateLimit.remaining} requests remaining (resets at ${new Date(data.metadata.rateLimit.resetAt).toLocaleTimeString()})</span>
            `;
        }

    } catch (error) {
        console.error('Sandbox execution error:', error);
        output.innerHTML = `
            <div class="output-error">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    } finally {
        // Reset button
        executeBtn.classList.remove('loading');
        executeBtn.innerHTML = '<i data-lucide="play" style="width: 16px; height: 16px;"></i> Execute Tool';
        reinitLucide();
    }
}

function loadExample(tool, params) {
    const toolSelect = document.getElementById('toolSelect');
    toolSelect.value = tool;
    updateToolParams();

    // Fill in params
    for (const [key, value] of Object.entries(params)) {
        const input = document.getElementById(`param_${key}`);
        if (input) {
            input.value = value;
        }
    }

    // Scroll to sandbox
    document.getElementById('sandbox').scrollIntoView({ behavior: 'smooth' });
}

function copyOutput() {
    const text = JSON.stringify(window.sandboxOutput, null, 2);
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyOutputBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i> Copied!';
        reinitLucide();
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            reinitLucide();
        }, 2000);
    });
}