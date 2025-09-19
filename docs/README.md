# Termi AI GitHub Pages

This directory contains the source files for the Termi AI GitHub Pages website.

## 🚀 Quick Start

1. **Enable GitHub Pages** in your repository settings
2. **Set source** to "Deploy from a branch"
3. **Select branch**: `main` (or your default branch)
4. **Select folder**: `/docs`
5. **Save** the configuration

## 📁 File Structure

```
docs/
├── index.html          # Main landing page
├── styles.css          # CSS styles
├── script.js           # JavaScript functionality
├── _config.yml         # Jekyll configuration
├── README.md           # This file
└── assets/             # Images and other assets (create as needed)
    ├── favicon.ico
    ├── og-image.png
    └── screenshots/
```

## 🎨 Customization

### Colors and Branding

- Update CSS variables in `styles.css` under `:root`
- Modify the primary color (`--primary-color`) to match your brand
- Adjust accent colors and typography as needed

### Content Updates

- **Hero Section**: Modify the main headline and description in `index.html`
- **Features**: Update feature cards with your specific capabilities
- **Download Links**: Point to your actual release URLs
- **GitHub Links**: Replace `yourusername` with your actual GitHub username

### Images and Assets

- Add your app screenshots to `assets/screenshots/`
- Create an `og-image.png` (1200x630px) for social media sharing
- Add a `favicon.ico` for the browser tab icon

## 🔧 Configuration

### Jekyll Settings (`_config.yml`)

- Update `url` and `baseurl` for your repository
- Modify `author` information
- Configure social media links
- Set up analytics (Google Analytics, etc.)

### SEO Optimization

- Update meta descriptions and keywords
- Configure Open Graph and Twitter Card images
- Set up proper page titles and descriptions

## 📱 Responsive Design

The site is built with mobile-first responsive design:

- **Mobile**: Optimized for phones (320px+)
- **Tablet**: Responsive layout for tablets (768px+)
- **Desktop**: Full-featured experience (1200px+)

## 🚀 Deployment

### Automatic Deployment

GitHub Pages automatically builds and deploys your site when you:

1. Push changes to the `main` branch
2. Update files in the `/docs` folder
3. Wait for the GitHub Actions build to complete

### Manual Deployment

If you need to test locally:

```bash
# Install Jekyll
gem install jekyll bundler

# Create Gemfile
bundle init
bundle add jekyll

# Serve locally
bundle exec jekyll serve --source docs
```

## 📊 Analytics and Tracking

### Google Analytics

Uncomment and configure in `_config.yml`:

```yaml
google_analytics: UA-XXXXXXXXX-X
```

### Event Tracking

The site includes built-in event tracking for:

- Download clicks
- Page performance
- User interactions
- Error monitoring

## 🔍 Search Functionality

The site includes a search feature that can be configured to:

- Search through documentation
- Search GitHub issues and discussions
- Provide instant results as users type

## ♿ Accessibility

Built with accessibility in mind:

- ARIA labels and landmarks
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Skip-to-content links

## 🌙 Dark Mode

Automatic dark mode support:

- Detects user's system preference
- Smooth transitions between themes
- Persistent theme selection

## 📈 Performance

Optimized for performance:

- Lazy loading for images
- Minified CSS and JavaScript
- Optimized fonts and icons
- Efficient animations
- Performance monitoring

## 🐛 Troubleshooting

### Common Issues

**Site not updating after push**

- Check GitHub Actions for build errors
- Verify the `/docs` folder is selected in Pages settings
- Wait a few minutes for deployment

**Styling issues**

- Clear browser cache
- Check for CSS syntax errors
- Verify file paths are correct

**JavaScript errors**

- Open browser console for error messages
- Check for missing dependencies
- Verify script loading order

### Debug Mode

Enable debug logging by adding `?debug=true` to your URL.

## 📚 Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

## 🤝 Contributing

To contribute to the website:

1. Make changes in the `/docs` folder
2. Test locally if possible
3. Submit a pull request
4. Wait for review and merge

## 📄 License

The website code is licensed under the same MIT License as the main project.

---

**Need help?** Open an issue on GitHub or check the [GitHub Pages documentation](https://docs.github.com/en/pages).
