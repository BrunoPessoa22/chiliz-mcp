# Contributing to Chiliz MCP

Thank you for your interest in contributing to Chiliz MCP! We welcome contributions from the community to make this project better.

## How to Contribute

### 1. Fork & Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/chiliz-mcp.git
cd chiliz-mcp

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/chiliz-mcp.git
```

### 2. Create a Branch

```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add liquidity pool analytics tool"

# We follow Conventional Commits:
# feat: New feature
# fix: Bug fix
# docs: Documentation changes
# style: Code style changes
# refactor: Code refactoring
# test: Test updates
# chore: Maintenance tasks
```

### 5. Push & Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## Pull Request Guidelines

### PR Title Format
Use clear, descriptive titles following this format:
- `feat: Add [feature name]`
- `fix: Fix [bug description]`
- `docs: Update [documentation area]`

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests (if applicable)

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No console errors
```

## Code Requirements

### New Tools
When adding new MCP tools:

1. **Create tool file** in `src/tools/`
2. **Add types** in `src/types/index.ts`
3. **Register tool** in `src/index.ts`
4. **Add tests** in `tests/`
5. **Update documentation**

Example structure:
```typescript
// src/tools/your-tool.ts
export async function yourNewTool(params: {
  // Define parameters
}): Promise<YourReturnType> {
  // Implementation
}
```

### Brazilian Token Additions
When adding new Brazilian fan tokens:

1. Update `FAN_TOKENS` array in `src/types/index.ts`
2. Add token contract address if available
3. Update landing page token grid
4. Add to documentation

### FanX DEX Features
For DEX-related contributions:

1. Add to `src/tools/fanx-dex.ts`
2. Update liquidity types if needed
3. Add pool pairs to popular list
4. Document new endpoints

## Development Setup

### Prerequisites
- Node.js 18+
- TypeScript knowledge
- Understanding of MCP protocol

### Local Development
```bash
# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Start development
npm run dev
```

## Areas for Contribution

### High Priority
- 🔴 **1inch DEX Integration**: Implement actual swap routing
- 🔴 **WebSocket Support**: Real-time price updates
- 🔴 **More Brazilian Tokens**: Add newly launched tokens
- 🔴 **Testing Coverage**: Increase test coverage to 80%+

### Medium Priority
- 🟡 **Historical Data**: Add database for storing historical data
- 🟡 **Social Sentiment**: Integrate actual Twitter/Reddit APIs
- 🟡 **NFT Support**: Add Chiliz NFT tools
- 🟡 **Staking Tools**: Add staking information tools

### Good First Issues
- 🟢 **Documentation**: Improve examples and guides
- 🟢 **Error Messages**: Make error messages more helpful
- 🟢 **Code Comments**: Add JSDoc comments
- 🟢 **UI Improvements**: Enhance landing page

## Project Structure

```
chiliz-mcp/
├── src/
│   ├── tools/         # MCP tool implementations
│   ├── api/           # External API clients
│   ├── types/         # TypeScript types
│   ├── config/        # Configuration
│   └── utils/         # Utilities
├── tests/             # Test files
├── landing-page/      # Website
└── examples/          # Usage examples
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --testNamePattern="FanX"
```

### Writing Tests
```typescript
describe('YourFeature', () => {
  it('should do something', async () => {
    const result = await yourFunction();
    expect(result).toBeDefined();
  });
});
```

## Communication

### Discord
Join our Discord: [discord.gg/chiliz](https://discord.gg/chiliz)

### Issues
- Check existing issues first
- Use issue templates
- Provide clear reproduction steps

### Discussions
- Use GitHub Discussions for questions
- Share ideas for new features
- Get community feedback

## Code Style

### TypeScript
- Use strict mode
- Define all types
- Avoid `any` type
- Use async/await over promises

### Naming
- Functions: camelCase
- Types/Interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case

### Formatting
```bash
# Format code
npm run format

# Lint code
npm run lint
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

## Questions?

- Open an issue
- Ask in Discord
- Email: contribute@example.com

Thank you for helping make Chiliz MCP better! 🚀