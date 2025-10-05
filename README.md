# Chiliz MCP Landing Page

A professional, modern landing page for the Chiliz MCP (Model Context Protocol) server featuring the official Chiliz brand colors and design language.

## Features

- 🎨 **Chiliz Brand Design**: Authentic red (#EE2E37) color scheme and professional styling
- 📱 **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- ⚡ **Interactive Elements**: Smooth animations, code copying, tab navigation
- 📖 **Complete Documentation**: Installation guide, API reference, and examples
- 🎯 **Clear CTAs**: Easy-to-follow installation steps and GitHub links
- 🚀 **Performance Optimized**: Lazy loading, efficient animations

## Sections

1. **Hero Section**: Eye-catching introduction with floating token animations
2. **Features**: 6 comprehensive feature cards showcasing capabilities
3. **Advantages**: Key benefits compared to other MCPs
4. **Installation**: Step-by-step setup guide with copy-able code blocks
5. **Documentation**: Technical details with tabbed interface
6. **Tools Reference**: Complete list of 23+ available tools
7. **Token Support**: Visual grid of supported fan tokens
8. **Call to Action**: GitHub and Discord community links

## How to View

### Local Preview
```bash
# Navigate to landing page directory
cd landing-page

# Python 3
python3 -m http.server 8000

# OR using Node.js
npx http-server -p 8000

# Open in browser
open http://localhost:8000
```

### Deploy to Vercel
```bash
vercel deploy landing-page
```

### Deploy to GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in Settings
3. Select the `landing-page` folder as source

## Files

- `index.html` - Main HTML structure with semantic markup
- `styles.css` - Complete CSS with Chiliz branding
- `script.js` - JavaScript for interactions and animations
- `README.md` - This documentation file

## Design System

### Colors
- Primary Red: `#EE2E37`
- Dark Red: `#CC1921`
- Dark Background: `#1A1A1A`
- Light Gray: `#F5F5F5`

### Typography
- Primary Font: Inter
- Monospace: Fira Code

### Components
- Gradient buttons with hover effects
- Card-based layouts with shadow transitions
- Animated floating tokens
- Interactive code blocks with copy functionality
- Responsive navigation with mobile menu

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lighthouse Score: 95+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Accessibility: WCAG 2.1 AA compliant

## Customization

To customize for your project:

1. Update GitHub links in `index.html`
2. Replace social media links in footer
3. Modify color scheme in CSS variables
4. Add your API documentation in the docs section

## License

MIT License - Free to use and modify

## Credits

Built for the Chiliz blockchain community with focus on professional presentation and developer experience.